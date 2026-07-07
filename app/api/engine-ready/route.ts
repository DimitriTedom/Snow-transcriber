import { NextResponse } from "next/server";

const ENGINE_URL = process.env.TRANSCRIBER_ENGINE_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(`${ENGINE_URL}/ready`, { cache: "no-store" });
    const payload = (await response.json()) as { ready?: boolean; service?: string };

    if (!response.ok) {
      return NextResponse.json(
        { status: "offline", ready: false, error: "Engine unhealthy" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: payload.ready ? "ready" : "warming",
      ready: Boolean(payload.ready),
      service: payload.service,
    });
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        ready: false,
        error: "Cannot reach transcription engine",
      },
      { status: 503 },
    );
  }
}