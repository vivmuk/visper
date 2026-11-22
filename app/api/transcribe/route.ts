// API Route: POST /api/transcribe
// Turns a recorded voice note into text with Venice speech-to-text.
// The audio is not stored.
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/middleware";
import { transcribeAudio } from "@/lib/venice/client";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "No recording received" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Recording is too long (25 MB max)" }, { status: 400 });
    }
    if (!/^(audio|video)\//.test(audio.type)) {
      return NextResponse.json({ error: "Unsupported audio format" }, { status: 400 });
    }

    const ext = audio.type.includes("mp4") || audio.type.includes("m4a")
      ? "m4a"
      : audio.type.includes("ogg")
      ? "ogg"
      : audio.type.includes("wav")
      ? "wav"
      : audio.type.includes("mpeg")
      ? "mp3"
      : "webm";

    const text = await transcribeAudio(audio, `voice-note.${ext}`);
    if (!/[\p{L}\p{N}]/u.test(text)) {
      return NextResponse.json({ error: "Couldn't hear anything in that recording" }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
