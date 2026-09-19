import fs from "node:fs/promises";
import type { TranscriptSegment } from "./media-analysis";

export async function transcribeAudio(audioPath: string): Promise<TranscriptSegment[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");
  const form = new FormData();
  form.append("file", new Blob([await fs.readFile(audioPath)], { type: "audio/mpeg" }), "audio.mp3");
  form.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("language", "en");
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!response.ok) throw new Error(`Groq transcription failed (${response.status}).`);
  const data = (await response.json()) as { segments?: Array<{ start: number; end: number; text: string }> };
  return (data.segments ?? []).map((segment) => ({ start: Number(segment.start), end: Number(segment.end), text: segment.text.trim() })).filter((segment) => segment.text && segment.end > segment.start);
}
