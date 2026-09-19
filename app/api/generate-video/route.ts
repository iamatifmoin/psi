import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { extractAudio, probeMedia, scanVisuals, type TimelinePayload } from "@/lib/media-analysis";
import { transcribeAudio } from "@/lib/groq";
import { directHighlight } from "@/lib/gemini";
import { renderHighlight } from "@/lib/render";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const id = randomUUID();
  const jobDir = path.join(process.cwd(), "tmp", id);
  try {
    const form = await request.formData();
    const file = form.get("video");
    if (!(file instanceof File)) return failure("Please choose an MP4 video.", 400);
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) return failure("Only MP4 uploads are supported.", 400);
    if (file.size > 250 * 1024 * 1024) return failure("Please use a short video under 250 MB.", 400);
    await cleanArtifactDirectory(path.join(process.cwd(), "public", "generated"));
    await cleanArtifactDirectory(path.join(process.cwd(), "public", "uploads"));
    await fs.mkdir(jobDir, { recursive: true });
    const sourcePath = path.join(jobDir, "source.mp4");
    const audioPath = path.join(jobDir, "audio.mp3");
    await fs.writeFile(sourcePath, Buffer.from(await file.arrayBuffer()));
    const metadata = await probeMedia(sourcePath);
    if (!metadata.duration || metadata.duration > 180) return failure("Please use a gameplay video shorter than 3 minutes.", 400);
    await extractAudio(sourcePath, audioPath);
    const [transcript, visuals] = await Promise.all([transcribeAudio(audioPath), scanVisuals(sourcePath)]);
    const timeline: TimelinePayload = { duration: metadata.duration, transcript, visuals };
    const decision = await directHighlight(timeline);
    const rendered = await renderHighlight({ sourcePath, jobDir, decision });
    return Response.json({ videoUrl: rendered.videoUrl, transcript, clips: rendered.clips, introNarration: decision.intro_narration, outroNarration: decision.outro_narration, duration: metadata.duration });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Video generation failed.", 500);
  } finally { await fs.rm(jobDir, { recursive: true, force: true }).catch(() => undefined); }
}

function failure(error: string, status: number): Response { return Response.json({ error, errorSource: "app", errorKind: "internal", external: false }, { status }); }

async function cleanArtifactDirectory(directory: string): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map((entry) => fs.rm(path.join(directory, entry.name), { recursive: entry.isDirectory(), force: true })));
}
