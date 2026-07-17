import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ENGINE_URL = process.env.TRANSCRIBER_ENGINE_URL ?? "http://localhost:8000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const response = await fetch(`${ENGINE_URL}/jobs/${jobId}`);
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.detail ?? "Failed to fetch job status." },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("fetch failed")
        ? "Lost connection to the transcription engine."
        : error instanceof Error
          ? error.message
          : "Unexpected error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
