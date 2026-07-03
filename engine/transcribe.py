from __future__ import annotations

import os
import tempfile
from pathlib import Path

from faster_whisper import WhisperModel

from scenes import Word


class TranscriptionService:
    def __init__(self) -> None:
        model_size = os.getenv("WHISPER_MODEL", "base")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    def transcribe_file(self, audio_path: Path, language: str | None = None) -> tuple[list[Word], float, str]:
        segments, info = self.model.transcribe(
            str(audio_path),
            language=language or None,
            word_timestamps=True,
            vad_filter=True,
        )

        words: list[Word] = []
        for segment in segments:
            if segment.words:
                for word in segment.words:
                    token = (word.word or "").strip()
                    if not token:
                        continue
                    words.append(
                        Word(
                            text=token,
                            start=float(word.start),
                            end=float(word.end),
                        )
                    )
            elif segment.text.strip():
                words.append(
                    Word(
                        text=segment.text.strip(),
                        start=float(segment.start),
                        end=float(segment.end),
                    )
                )

        detected_language = info.language or "unknown"
        duration = float(info.duration or (words[-1].end if words else 0.0))
        return words, duration, detected_language


_service: TranscriptionService | None = None


def get_transcription_service() -> TranscriptionService:
    global _service
    if _service is None:
        _service = TranscriptionService()
    return _service


def transcribe_upload(file_name: str, file_bytes: bytes, language: str | None = None) -> tuple[list[Word], float, str]:
    suffix = Path(file_name).suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(file_bytes)
        temp_path = Path(temp_file.name)

    try:
        return get_transcription_service().transcribe_file(temp_path, language=language)
    finally:
        temp_path.unlink(missing_ok=True)