from __future__ import annotations

import difflib
import re

from dataclasses import dataclass


@dataclass
class Word:
    text: str
    start: float
    end: float


@dataclass
class Scene:
    id: int
    start: float
    end: float
    text: str
    word_count: int


def format_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes:02d}:{secs:04.1f}"


def format_timestamp_range(start: float, end: float) -> str:
    return f"{format_timestamp(start)} – {format_timestamp(end)}"


def collect_words_in_range(words: list[Word], start: float, end: float) -> list[Word]:
    return [word for word in words if word.start < end and word.end > start]


def words_to_text(words: list[Word]) -> str:
    return " ".join(word.text.strip() for word in words if word.text.strip()).strip()


def parse_script_tags(script_text: str) -> tuple[str, list[tuple[int, str, float | None]]]:
    # Match any [SCENE] or [PACE:X] tag, including optional surrounding spaces
    pattern = re.compile(r'\s*\[(PACE:[\d.]+s?|SCENE)\]\s*', re.IGNORECASE)
    parts = pattern.split(script_text)
    
    clean_words = []
    commands = []
    
    is_command = False
    for part in parts:
        if is_command:
            cmd = part.upper()
            word_idx = len(clean_words)
            if cmd == "SCENE":
                commands.append((word_idx, "SCENE", None))
            elif cmd.startswith("PACE:"):
                val_str = cmd.split(":")[1].replace("S", "")
                try:
                    val = float(val_str)
                    commands.append((word_idx, "PACE", val))
                except ValueError:
                    pass
            is_command = False
        else:
            tokens = part.split()
            clean_words.extend(tokens)
            is_command = True
            
    clean_script = " ".join(clean_words)
    return clean_script, commands


def align_script_with_whisper(
    whisper_words: list[Word],
    script_text: str,
    total_duration: float,
) -> tuple[list[Word], list[tuple[int, str, float | None]]]:
    """Aligns the words from the script text with the whisper words using SequenceMatcher."""
    clean_script_text, commands = parse_script_tags(script_text)
    
    script_tokens = [w for w in re.split(r'(\s+)', clean_script_text) if w.strip()]
    if not script_tokens:
        return whisper_words, []
    if not whisper_words:
        step = total_duration / max(1, len(script_tokens))
        aligned_words = [Word(text=tok, start=i*step, end=(i+1)*step) for i, tok in enumerate(script_tokens)]
        return aligned_words, commands

    def clean(t: str) -> str:
        return re.sub(r'[^\w]', '', t).lower()

    clean_script = [clean(t) for t in script_tokens]
    clean_whisper = [clean(w.text) for w in whisper_words]

    matcher = difflib.SequenceMatcher(None, clean_script, clean_whisper)
    matches = matcher.get_matching_blocks()

    aligned: list[Word] = [Word(text=tok, start=0.0, end=0.0) for tok in script_tokens]
    matched_indices = set()

    for match in matches:
        for i in range(match.size):
            s_idx = match.a + i
            w_idx = match.b + i
            aligned[s_idx].start = whisper_words[w_idx].start
            aligned[s_idx].end = whisper_words[w_idx].end
            matched_indices.add(s_idx)

    # Interpolate unmatched
    last_end = 0.0
    for i in range(len(aligned)):
        if i in matched_indices:
            last_end = aligned[i].end
            continue
        
        # Find next matched
        next_start = total_duration
        gap_size = 1
        for j in range(i + 1, len(aligned)):
            if j in matched_indices:
                next_start = aligned[j].start
                gap_size = j - i
                break
            if j == len(aligned) - 1:
                gap_size = (len(aligned) - i)
                
        step = max(0.0, (next_start - last_end) / (gap_size + 1))
        aligned[i].start = round(last_end + step, 3)
        aligned[i].end = round(last_end + step * 2, 3)
        last_end = aligned[i].end

    return aligned, commands


def compute_scene_boundaries(
    words: list[Word],
    total_duration: float,
    default_scene_duration: float,
    commands: list[tuple[int, str, float | None]] = None,
    hook_duration: float = 0.0,
    hook_scene_duration: float = 0.0,
) -> list[float]:
    if not words:
        return [0.0, total_duration]
        
    pace_events = []
    hard_boundaries = {0.0, total_duration}
    
    if hook_duration > 0 and hook_scene_duration > 0:
        pace_events.append((0.0, hook_scene_duration))
        pace_events.append((hook_duration, default_scene_duration))
    else:
        pace_events.append((0.0, default_scene_duration))
        
    if commands:
        for word_idx, cmd_type, val in commands:
            if word_idx < 0 or word_idx >= len(words):
                continue
            t = words[word_idx].start
            if cmd_type == "SCENE":
                hard_boundaries.add(t)
            elif cmd_type == "PACE":
                pace_events.append((t, val))
                
    pace_events.sort(key=lambda x: x[0])
    
    unique_pace_events = []
    for t, dur in pace_events:
        if unique_pace_events and unique_pace_events[-1][0] == t:
            unique_pace_events[-1] = (t, dur)
        else:
            unique_pace_events.append((t, dur))
            
    boundaries = [0.0]
    cursor = 0.0
    
    def get_active_pacing(timestamp: float) -> float:
        active_dur = default_scene_duration
        for event_t, event_dur in unique_pace_events:
            if timestamp >= event_t:
                active_dur = event_dur
            else:
                break
        return active_dur
        
    while cursor < total_duration:
        pacing = get_active_pacing(cursor)
        next_split = cursor + pacing
        
        earliest_hard = None
        for hb in sorted(hard_boundaries):
            if hb > cursor + 0.05 and hb < next_split - 0.05:
                earliest_hard = hb
                break
                
        if earliest_hard is not None:
            cursor = earliest_hard
        else:
            cursor = next_split
            
        for event_t, _ in unique_pace_events:
            if event_t > boundaries[-1] + 0.05 and event_t < cursor - 0.05:
                cursor = event_t
                break
                
        if cursor >= total_duration - 0.05:
            break
            
        boundaries.append(round(cursor, 3))
        
    boundaries.append(round(total_duration, 3))
    return sorted(list(set(boundaries)))


def build_dynamic_scenes(
    words: list[Word],
    total_duration: float,
    default_scene_duration: float,
    commands: list[tuple[int, str, float | None]] = None,
    hook_duration: float = 0.0,
    hook_scene_duration: float = 0.0,
) -> list[Scene]:
    boundaries = compute_scene_boundaries(
        words=words,
        total_duration=total_duration,
        default_scene_duration=default_scene_duration,
        commands=commands,
        hook_duration=hook_duration,
        hook_scene_duration=hook_scene_duration,
    )
    
    scenes: list[Scene] = []
    for scene_id, (start, end) in enumerate(zip(boundaries[:-1], boundaries[1:]), start=1):
        if end - start < 0.05:
            continue
        scene_words = collect_words_in_range(words, start, end)
        scenes.append(
            Scene(
                id=scene_id,
                start=round(start, 3),
                end=round(end, 3),
                text=words_to_text(scene_words),
                word_count=len(scene_words),
            )
        )
    return scenes


def detect_pause_boundaries(
    words: list[Word],
    total_duration: float,
    pause_threshold: float,
) -> list[float]:
    if not words:
        return [0.0, total_duration]

    boundaries = [0.0]

    for index in range(len(words) - 1):
        gap = words[index + 1].start - words[index].end
        if gap >= pause_threshold:
            midpoint = (words[index].end + words[index + 1].start) / 2
            boundaries.append(midpoint)

    boundaries.append(max(total_duration, words[-1].end))
    return sorted(set(boundaries))


def build_pause_scenes(
    words: list[Word],
    total_duration: float,
    pause_threshold: float,
    max_scene_duration: float | None = None,
) -> list[Scene]:
    boundaries = detect_pause_boundaries(words, total_duration, pause_threshold)
    raw_ranges: list[tuple[float, float]] = []

    for index in range(len(boundaries) - 1):
        start = boundaries[index]
        end = boundaries[index + 1]
        if end - start < 0.05:
            continue
        raw_ranges.append((start, end))

    if max_scene_duration:
        split_ranges: list[tuple[float, float]] = []
        for start, end in raw_ranges:
            cursor = start
            while cursor < end:
                chunk_end = min(cursor + max_scene_duration, end)
                if chunk_end - cursor >= 0.05:
                    split_ranges.append((cursor, chunk_end))
                cursor = chunk_end
        raw_ranges = split_ranges

    scenes: list[Scene] = []
    for scene_id, (start, end) in enumerate(raw_ranges, start=1):
        scene_words = collect_words_in_range(words, start, end)
        scenes.append(
            Scene(
                id=scene_id,
                start=round(start, 3),
                end=round(end, 3),
                text=words_to_text(scene_words),
                word_count=len(scene_words),
            )
        )

    return scenes


def build_fixed_scenes(
    words: list[Word],
    total_duration: float,
    scene_duration: float,
) -> list[Scene]:
    if scene_duration <= 0:
        raise ValueError("scene_duration must be greater than 0")

    scenes: list[Scene] = []
    cursor = 0.0
    scene_id = 1

    while cursor < total_duration:
        end = min(cursor + scene_duration, total_duration)
        if end - cursor < 0.05:
            break

        scene_words = collect_words_in_range(words, cursor, end)
        scenes.append(
            Scene(
                id=scene_id,
                start=round(cursor, 3),
                end=round(end, 3),
                text=words_to_text(scene_words),
                word_count=len(scene_words),
            )
        )
        scene_id += 1
        cursor = end

    return scenes