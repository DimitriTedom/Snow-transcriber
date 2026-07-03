import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const ENGINE_URL = process.env.TRANSCRIBER_ENGINE_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const engineForm = new FormData();
    engineForm.append("audio", audio, audio.name);
    engineForm.append("script", String(incoming.get("script") ?? ""));
    engineForm.append("mode", String(incoming.get("mode") ?? "fixed"));
    engineForm.append("scene_duration", String(incoming.get("scene_duration") ?? "6"));
    engineForm.append("pause_threshold", String(incoming.get("pause_threshold") ?? "0.5"));
    engineForm.append("max_scene_duration", String(incoming.get("max_scene_duration") ?? "0"));
    engineForm.append("language", String(incoming.get("language") ?? ""));
    engineForm.append("scene_type", String(incoming.get("scene_type") ?? "?"));

    const response = await fetch(`${ENGINE_URL}/transcribe`, {
      method: "POST",
      body: engineForm,
    });

    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.detail ?? "Transcription engine failed." },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("fetch failed")
        ? "Cannot reach transcription engine. Start it with `npm run engine:up`."
        : error instanceof Error
          ? error.message
          : "Unexpected transcription error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}