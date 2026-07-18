import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 3600;

const ENGINE_URL = process.env.TRANSCRIBER_ENGINE_URL ?? "http://localhost:8000";

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("aborted")))
  );
}

export async function POST(request: Request) {
  const engineAbort = new AbortController();

  const onClientAbort = () => engineAbort.abort();
  if (request.signal.aborted) {
    return NextResponse.json({ error: "Transcription cancelled." }, { status: 499 });
  }
  request.signal.addEventListener("abort", onClientAbort);

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
    engineForm.append("hook_duration", String(incoming.get("hook_duration") ?? "0"));
    engineForm.append("hook_scene_duration", String(incoming.get("hook_scene_duration") ?? "0"));

    const response = await fetch(`${ENGINE_URL}/transcribe/async`, {
      method: "POST",
      body: engineForm,
      signal: engineAbort.signal,
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
    if (request.signal.aborted || engineAbort.signal.aborted || isAbortError(error)) {
      return NextResponse.json({ error: "Transcription cancelled." }, { status: 499 });
    }

    const message =
      error instanceof Error && error.message.includes("fetch failed")
        ? "Lost connection to the transcription engine. It may still be working — check `npm run engine:logs` before retrying."
        : error instanceof Error
          ? error.message
          : "Unexpected transcription error.";

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    request.signal.removeEventListener("abort", onClientAbort);
  }
}