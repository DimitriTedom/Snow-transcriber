import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type { TranscriptionResult } from "./types.js";

const ENGINE_URL = process.env.SNOW_ENGINE_URL ?? process.env.TRANSCRIBER_ENGINE_URL ?? "http://localhost:8000";

export type TranscribeOptions = {
  audioPath: string;
  scriptPath?: string;
  mode?: "fixed" | "pause";
  sceneDuration?: number;
  pauseThreshold?: number;
  maxSceneDuration?: number;
  language?: string;
  sceneType?: string;
};

export async function checkEngineHealth(): Promise<{
  status: "online" | "offline";
  service?: string;
  engineUrl: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${ENGINE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      return {
        status: "offline",
        engineUrl: ENGINE_URL,
        error: `Engine returned HTTP ${response.status}`,
      };
    }
    const payload = (await response.json()) as { service?: string };
    return { status: "online", service: payload.service, engineUrl: ENGINE_URL };
  } catch (error) {
    return {
      status: "offline",
      engineUrl: ENGINE_URL,
      error: error instanceof Error ? error.message : "Engine unreachable",
    };
  }
}

export async function transcribeAudio(options: TranscribeOptions): Promise<TranscriptionResult> {
  const health = await checkEngineHealth();
  if (health.status !== "online") {
    throw new Error(
      `Whisper engine is offline at ${ENGINE_URL}. Start it with: npm run engine:up. ${health.error ?? ""}`.trim(),
    );
  }

  const audioBytes = await readFile(options.audioPath);
  if (!audioBytes.byteLength) {
    throw new Error(`Audio file is empty: ${options.audioPath}`);
  }

  const form = new FormData();
  form.append("audio", new Blob([audioBytes]), basename(options.audioPath));
  form.append("mode", options.mode ?? "fixed");
  form.append("scene_duration", String(options.sceneDuration ?? 6));
  form.append("pause_threshold", String(options.pauseThreshold ?? 0.5));
  form.append("max_scene_duration", String(options.maxSceneDuration ?? 0));
  form.append("language", options.language ?? "");
  form.append("scene_type", options.sceneType ?? "?");

  if (options.scriptPath) {
    const script = await readFile(options.scriptPath, "utf8");
    form.append("script", script);
  } else {
    form.append("script", "");
  }

  const response = await fetch(`${ENGINE_URL}/transcribe`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(600_000),
  });

  const payload = await response.json();

  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : JSON.stringify(payload);
    throw new Error(`Transcription failed (HTTP ${response.status}): ${detail}`);
  }

  return payload as TranscriptionResult;
}

export function getEngineUrl(): string {
  return ENGINE_URL;
}