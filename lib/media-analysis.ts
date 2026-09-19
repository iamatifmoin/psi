import fs from "node:fs";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import "@/lib/ffmpeg-config";

export type TranscriptSegment = { start: number; end: number; text: string };
export type VisualObservation = { time: number; score: number; kind: "scene_change" | "visual_energy" };
export type TimelinePayload = { duration: number; transcript: TranscriptSegment[]; visuals: VisualObservation[] };

export async function probeMedia(filePath: string): Promise<{ duration: number; width: number; height: number }> {
  const data = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, result) => (err ? reject(err) : resolve(result)));
  });
  const video = data.streams.find((stream) => stream.codec_type === "video");
  return { duration: Number(data.format.duration ?? video?.duration ?? 0), width: Number(video?.width ?? 0), height: Number(video?.height ?? 0) };
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
  return Array.from({ length: Math.ceil(duration / 2) }, (_, index) => ({ time: index * 2, score: 0.5, kind: "visual_energy" as const }));
}

export function ensureParent(filePath: string): void { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }
