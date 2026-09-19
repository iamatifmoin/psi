import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import { FFMPEG_PATH } from "@/lib/ffmpeg-config";

export type TranscriptSegment = { start: number; end: number; text: string };
export type VisualObservation = { time: number; score: number; kind: "scene_change" | "visual_energy" };
export type TimelinePayload = { duration: number; transcript: TranscriptSegment[]; visuals: VisualObservation[] };

export async function probeMedia(filePath: string): Promise<{ duration: number; width: number; height: number }> {
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, ["-hide_banner", "-i", filePath], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", () => resolve(stderr));
  });
  const durationMatch = output.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  const videoMatch = output.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  if (!durationMatch) throw new Error("FFmpeg could not read the video duration.");
  const [, hours, minutes, seconds] = durationMatch;
  return { duration: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds), width: Number(videoMatch?.[1] ?? 0), height: Number(videoMatch?.[2] ?? 0) };
}

export async function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath).noVideo().audioCodec("libmp3lame").audioFrequency(16000).audioChannels(1).audioBitrate("64k").output(outputPath).on("end", () => resolve()).on("error", reject).run();
  });
}

export async function scanVisuals(inputPath: string): Promise<VisualObservation[]> {
  const observations: VisualObservation[] = [];
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath).videoFilters("select='gt(scene,0.30)',showinfo").outputOptions(["-an", "-f", "null"]).output(process.platform === "win32" ? "NUL" : "/dev/null").on("stderr", (line) => {
      const match = line.match(/pts_time:([0-9.]+)/);
      if (match) observations.push({ time: Number(match[1]), score: 1, kind: "scene_change" });
    }).on("end", () => resolve()).on("error", reject).run();
  });
  if (observations.length > 0) return observations.slice(0, 80);
  const { duration } = await probeMedia(inputPath);
  const fallback = Array.from({ length: Math.ceil(duration / 2) }, (_, index) => ({ time: index * 2, score: 0.5, kind: "visual_energy" as const }));
  return fallback;
}

export function ensureParent(filePath: string): void { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }
