import { NextResponse } from "next/server";

const ENGINE_URL = process.env.TRANSCRIBER_ENGINE_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const [healthResponse, readyResponse] = await Promise.all([
      fetch(`${ENGINE_URL}/health`, { cache: "no-store" }),
      fetch(`${ENGINE_URL}/ready`, { cache: "no-store" }),
    ]);
    const healthPayload = await healthResponse.json();
    const readyPayload = readyResponse.ok ? await readyResponse.json() : { ready: false };

    if (!healthResponse.ok) {
      return NextResponse.json({ status: "offline", error: "Engine unhealthy" }, { status: 503 });
    }

    return NextResponse.json({
      status: readyPayload.ready ? "online" : "warming",
      ready: Boolean(readyPayload.ready),
      service: healthPayload.service,
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