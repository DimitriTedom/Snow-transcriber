from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scenes import Scene, align_script_with_whisper, build_fixed_scenes, build_pause_scenes, format_timestamp_range, build_dynamic_scenes
from system import get_system_stats
from transcribe import get_transcription_service, is_model_ready, transcribe_upload
import uuid

# In-memory dictionary to store active jobs
jobs = {}

def process_transcription_job(
    job_id: str,
    file_bytes: bytes,
    file_name: str,
    script: str,
    mode: str,
    scene_duration: float,
    pause_threshold: float,
    max_scene_duration: float,
    language: str,
    scene_type: str,
    hook_duration: float = 0.0,
    hook_scene_duration: float = 0.0,
):
    try:
        words, total_duration, detected_language = transcribe_upload(
            file_name,
            file_bytes,
            language or None,
        )

        commands = []
        if script.strip():
            words, commands = align_script_with_whisper(words, script, total_duration)

        max_duration = max_scene_duration if max_scene_duration > 0 else None

        if mode == "pause":
            scenes = build_pause_scenes(
                words=words,
                total_duration=total_duration,
                pause_threshold=pause_threshold,
                max_scene_duration=max_duration,
            )
            effective_scene_duration = None
            effective_pause_threshold = pause_threshold
        else:
            scenes = build_dynamic_scenes(
                words=words,
                total_duration=total_duration,
                default_scene_duration=scene_duration,
                commands=commands,
                hook_duration=hook_duration,
                hook_scene_duration=hook_scene_duration,
            )
            effective_scene_duration = scene_duration
            effective_pause_threshold = None

        scene_payloads = [scene_to_payload(scene) for scene in scenes]
        formatted_text = build_formatted_text(scenes, scene_type=scene_type or "?")
        agent_json = build_agent_json(
            scenes=scenes,
            total_duration=total_duration,
            scene_mode=mode,
            scene_duration=effective_scene_duration,
            pause_threshold=effective_pause_threshold,
            detected_language=detected_language,
            script=script,
        )

        response = TranscriptionResponse(
            totalDuration=round(total_duration, 3),
            sceneCount=len(scenes),
            sceneMode=mode,
            sceneDuration=effective_scene_duration,
            pauseThreshold=effective_pause_threshold,
            detectedLanguage=detected_language,
            scriptProvided=bool(script.strip()),
            scenes=scene_payloads,
            formattedText=formatted_text,
            agentJson=agent_json,
        )

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = response.model_dump()

    except Exception as error:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(error)



@asynccontextmanager
async def lifespan(_: FastAPI):
    async def warmup() -> None:
        try:
            await asyncio.to_thread(get_transcription_service)
        except Exception as error:  # noqa: BLE001
            print(f"Whisper model warmup failed: {error}")

    warmup_task = asyncio.create_task(warmup())
    yield
    warmup_task.cancel()


app = FastAPI(title="Snow Transcriber Engine", version="0.1.0", lifespan=lifespan)

allowed_origins = os.getenv("ENGINE_CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScenePayload(BaseModel):
    id: int
    start: float
    end: float
    text: str
    wordCount: int
    timestampRange: str


class TranscriptionResponse(BaseModel):
    totalDuration: float
    sceneCount: int
    sceneMode: Literal["fixed", "pause"]
    sceneDuration: float | None = None
    pauseThreshold: float | None = None
    detectedLanguage: str
    scriptProvided: bool
    scenes: list[ScenePayload]
    formattedText: str
    agentJson: dict


def scene_to_payload(scene: Scene) -> ScenePayload:
    return ScenePayload(
        id=scene.id,
        start=scene.start,
        end=scene.end,
        text=scene.text,
        wordCount=scene.word_count,
        timestampRange=format_timestamp_range(scene.start, scene.end),
    )


def build_formatted_text(scenes: list[Scene], scene_type: str = "?") -> str:
    blocks: list[str] = []
    for scene in scenes:
        blocks.append(
            "\n".join(
                [
                    "=" * 57,
                    f"[SCENE {scene.id:02d}] [{format_timestamp_range(scene.start, scene.end)}] [{scene_type}]",
                    "",
                    scene.text,
                    "=" * 57,
                ]
            )
        )
    return "\n\n".join(blocks)


def build_agent_json(
    scenes: list[Scene],
    total_duration: float,
    scene_mode: str,
    scene_duration: float | None,
    pause_threshold: float | None,
    detected_language: str,
    script: str,
) -> dict:
    return {
        "totalDuration": round(total_duration, 3),
        "sceneCount": len(scenes),
        "sceneMode": scene_mode,
        "sceneDuration": scene_duration,
        "pauseThreshold": pause_threshold,
        "detectedLanguage": detected_language,
        "scriptProvided": bool(script.strip()),
        "scenes": [
            {
                "id": scene.id,
                "start": scene.start,
                "end": scene.end,
                "duration": round(scene.end - scene.start, 3),
                "text": scene.text,
                "wordCount": scene.word_count,
                "timestampRange": format_timestamp_range(scene.start, scene.end),
            }
            for scene in scenes
        ],
    }


@app.get("/system/stats")
def system_stats() -> dict:
    return get_system_stats()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "snow-transcriber-engine"}


@app.get("/ready")
def ready() -> dict[str, str | bool]:
    return {
        "ready": is_model_ready(),
        "service": "snow-transcriber-engine",
    }


@app.post("/transcribe/async")
async def transcribe_async(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    script: str = Form(""),
    mode: Literal["fixed", "pause"] = Form("fixed"),
    scene_duration: float = Form(6.0),
    pause_threshold: float = Form(0.5),
    max_scene_duration: float = Form(0.0),
    language: str = Form(""),
    scene_type: str = Form("?"),
    hook_duration: float = Form(0.0),
    hook_scene_duration: float = Form(0.0),
):
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Audio file is required.")

    file_bytes = await audio.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

    max_upload_mb = float(os.getenv("MAX_UPLOAD_MB", "100"))
    if len(file_bytes) > max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file exceeds {max_upload_mb}MB limit.",
        )

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "processing", "result": None, "error": None}

    background_tasks.add_task(
        process_transcription_job,
        job_id,
        file_bytes,
        audio.filename,
        script,
        mode,
        scene_duration,
        pause_threshold,
        max_scene_duration,
        language,
        scene_type,
        hook_duration,
        hook_scene_duration,
    )

    return {"jobId": job_id, "status": "processing"}


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    audio: UploadFile = File(...),
    script: str = Form(""),
    mode: Literal["fixed", "pause"] = Form("fixed"),
    scene_duration: float = Form(6.0),
    pause_threshold: float = Form(0.5),
    max_scene_duration: float = Form(0.0),
    language: str = Form(""),
    scene_type: str = Form("?"),
) -> TranscriptionResponse:
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Audio file is required.")

    file_bytes = await audio.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

    max_upload_mb = float(os.getenv("MAX_UPLOAD_MB", "100"))
    if len(file_bytes) > max_upload_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file exceeds {max_upload_mb}MB limit.",
        )

    try:
        words, total_duration, detected_language = await asyncio.to_thread(
            transcribe_upload,
            audio.filename,
            file_bytes,
            language or None,
        )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Transcription failed: {error}") from error

    if script.strip():
        words = align_script_with_whisper(words, script, total_duration)

    max_duration = max_scene_duration if max_scene_duration > 0 else None

    if mode == "pause":
        scenes = build_pause_scenes(
            words=words,
            total_duration=total_duration,
            pause_threshold=pause_threshold,
            max_scene_duration=max_duration,
        )
        effective_scene_duration = None
        effective_pause_threshold = pause_threshold
    else:
        scenes = build_fixed_scenes(
            words=words,
            total_duration=total_duration,
            scene_duration=scene_duration,
        )
        effective_scene_duration = scene_duration
        effective_pause_threshold = None

    scene_payloads = [scene_to_payload(scene) for scene in scenes]
    formatted_text = build_formatted_text(scenes, scene_type=scene_type or "?")
    agent_json = build_agent_json(
        scenes=scenes,
        total_duration=total_duration,
        scene_mode=mode,
        scene_duration=effective_scene_duration,
        pause_threshold=effective_pause_threshold,
        detected_language=detected_language,
        script=script,
    )

    return TranscriptionResponse(
        totalDuration=round(total_duration, 3),
        sceneCount=len(scenes),
        sceneMode=mode,
        sceneDuration=effective_scene_duration,
        pauseThreshold=effective_pause_threshold,
        detectedLanguage=detected_language,
        scriptProvided=bool(script.strip()),
        scenes=scene_payloads,
        formattedText=formatted_text,
        agentJson=agent_json,
    )