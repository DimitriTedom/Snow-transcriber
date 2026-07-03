from __future__ import annotations

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