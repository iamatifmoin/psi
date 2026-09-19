import fs from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import "@/lib/ffmpeg-config";
import type { DirectorDecision } from "./gemini";
import { synthesizeSpeech } from "./tts";

export async function renderHighlight(input: { sourcePath: string; jobDir: string; decision: DirectorDecision }): Promise<{ videoUrl: string }> {
  const segmentPaths: string[] = [];
  for (const [index, clip] of input.decision.clips.entries()) {
    const segmentPath = path.join(input.jobDir, `clip-${index}.mp4`);
    await renderClip(input.sourcePath, segmentPath, clip.start_time, clip.end_time - clip.start_time);
    segmentPaths.push(segmentPath);
  }
  const highlightsPath = path.join(input.jobDir, "highlights.mp4");
  await concatSegments(segmentPaths, highlightsPath);
  const introPath = path.join(input.jobDir, "intro.mp3");
  const outroPath = path.join(input.jobDir, "outro.mp3");
  await Promise.all([synthesizeSpeech(input.decision.intro_narration, introPath), synthesizeSpeech(input.decision.outro_narration, outroPath)]);
  const outputDir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(outputDir, { recursive: true });
  const outputName = `${path.basename(input.jobDir)}.mp4`;
  await concatNarratedSections(introPath, highlightsPath, outroPath, path.join(outputDir, outputName));
  return { videoUrl: `/generated/${outputName}` };
}

async function renderClip(input: string, output: string, start: number, duration: number): Promise<void> {
  await new Promise<void>((resolve, reject) => { ffmpeg(input).setStartTime(start).duration(duration).videoFilters("scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1").outputOptions(["-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k", "-movflags", "+faststart"]).output(output).on("end", () => resolve()).on("error", reject).run(); });
}

async function concatSegments(segments: string[], output: string): Promise<void> {
  const listPath = path.join(path.dirname(output), "concat.txt");
  await fs.writeFile(listPath, segments.map((segment) => `file '${segment.replaceAll("'", "'\\''")}'`).join("\n"));
  await new Promise<void>((resolve, reject) => { ffmpeg().input(listPath).inputOptions(["-f", "concat", "-safe", "0"]).outputOptions(["-c", "copy", "-movflags", "+faststart"]).output(output).on("end", () => resolve()).on("error", reject).run(); });
}

async function concatNarratedSections(intro: string, highlights: string, outro: string, output: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg().input("color=c=black:s=1280x720:r=30").inputOptions(["-f", "lavfi", "-t", "8"]).input(intro).input(highlights).input("color=c=black:s=1280x720:r=30").inputOptions(["-f", "lavfi", "-t", "8"]).input(outro).complexFilter(["[0:v]format=yuv420p[introv]", "[3:v]format=yuv420p[outrov]", "[0:v][1:a][2:v][2:a][3:v][4:a]concat=n=3:v=1:a=1[v][a]"]).outputOptions(["-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"]).output(output).on("end", () => resolve()).on("error", reject).run();
  });
}
