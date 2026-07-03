import { NextResponse } from "next/server";

const ENGINE_URL = process.env.TRANSCRIBER_ENGINE_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(`${ENGINE_URL}/health`, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json({ status: "offline", error: "Engine unhealthy" }, { status: 503 });
    }

    return NextResponse.json({
      status: "online",
      service: payload.service,
      whisperModel: process.env.WHISPER_MODEL ?? "base",
      whisperDevice: process.env.WHISPER_DEVICE ?? "cpu",
    });
  } catch {
    return NextResponse.json(
      { status: "offline", error: "Cannot reach transcription engine" },
      { status: 503 },
    );
  }
}