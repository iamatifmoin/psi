import fs from "node:fs/promises";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import "@/lib/ffmpeg-config";
import type { DirectorDecision } from "./gemini";
import { synthesizeSpeech } from "./tts";
import { probeMedia, type TranscriptSegment } from "./media-analysis";

export type RenderedClip = DirectorDecision["clips"][number] & { result_start_time: number };

export async function renderHighlight(input: { sourcePath: string; jobDir: string; decision: DirectorDecision; transcript: TranscriptSegment[] }): Promise<{ videoUrl: string; clips: RenderedClip[] }> {
  const segmentPaths: string[] = [];
  for (const [index, clip] of input.decision.clips.entries()) {
    const segmentPath = path.join(input.jobDir, `clip-${index}.mp4`);
    const subtitlePath = await writeClipSubtitles(input.jobDir, index, clip.start_time, clip.end_time, input.transcript);
    await renderClip(input.sourcePath, segmentPath, clip.start_time, clip.end_time - clip.start_time, clip.label || `Highlight ${index + 1}`, subtitlePath);
    segmentPaths.push(segmentPath);
  }

  const highlightsPath = path.join(input.jobDir, "highlights.mp4");
  await concatSegments(segmentPaths, highlightsPath);
  const introPath = path.join(input.jobDir, "intro.mp3");
  const outroPath = path.join(input.jobDir, "outro.mp3");
  await Promise.all([synthesizeSpeech(input.decision.intro_narration, introPath), synthesizeSpeech(input.decision.outro_narration, outroPath)]);

  const highlightDuration = (await probeMedia(highlightsPath)).duration;
  const introSourceDuration = Math.max(0.1, (await probeMedia(introPath)).duration);
  const outroSourceDuration = Math.max(0.1, (await probeMedia(outroPath)).duration);
  const cleanGameplayGap = Math.min(4, Math.max(1, highlightDuration - 1));
  const narrationSlot = Math.max(0.5, (highlightDuration - cleanGameplayGap) / 2);
  const introDuration = Math.min(introSourceDuration, 3, narrationSlot);
  const outroDuration = Math.min(outroSourceDuration, 3, narrationSlot);
  const outroStart = Math.min(highlightDuration - outroDuration, Math.max(introDuration + cleanGameplayGap, highlightDuration - outroDuration));

  const renderedClips: RenderedClip[] = [];
  let resultOffset = 0;
  for (const clip of input.decision.clips) {
    renderedClips.push({ ...clip, result_start_time: resultOffset });
    resultOffset += clip.end_time - clip.start_time;
  }

  const outputDir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(outputDir, { recursive: true });
  const outputName = `${path.basename(input.jobDir)}.mp4`;
  await renderNarratedHighlights(highlightsPath, introPath, outroPath, highlightDuration, introSourceDuration, outroSourceDuration, introDuration, outroDuration, outroStart, path.join(outputDir, outputName));
  return { videoUrl: `/generated/${outputName}`, clips: renderedClips };
}

async function renderClip(input: string, output: string, start: number, duration: number, label: string, subtitlePath: string | null): Promise<void> {
  const safeLabel = label.replace(/[^a-zA-Z0-9 .,!?-]/g, "").slice(0, 80) || "Highlight";
  const filters = [
    "scale=1280:720:force_original_aspect_ratio=decrease",
    "pad=1280:720:(ow-iw)/2:(oh-ih)/2",
    "setsar=1",
    `drawtext=text='${safeLabel.replace(/'/g, "\\'")}':x=36:y=32:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=12`,
  ];
  if (subtitlePath) filters.push(`subtitles='${subtitlePath.replace(/'/g, "\\'")}'`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(input).setStartTime(start).duration(duration).videoFilters(filters).outputOptions(["-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k", "-movflags", "+faststart"]).output(output).on("end", () => resolve()).on("error", reject).run();
  });
}

async function concatSegments(segments: string[], output: string): Promise<void> {
  const listPath = path.join(path.dirname(output), "concat.txt");
  await fs.writeFile(listPath, segments.map((segment) => `file '${segment.replaceAll("'", "'\\''")}'`).join("\n"));
  await new Promise<void>((resolve, reject) => { ffmpeg().input(listPath).inputOptions(["-f", "concat", "-safe", "0"]).outputOptions(["-c", "copy", "-movflags", "+faststart"]).output(output).on("end", () => resolve()).on("error", reject).run(); });
}

async function renderNarratedHighlights(highlights: string, intro: string, outro: string, highlightDuration: number, introSourceDuration: number, outroSourceDuration: number, introDuration: number, outroDuration: number, outroStart: number, output: string): Promise<void> {
  const duckExpression = `between(t,0,${introDuration})+between(t,${outroStart},${highlightDuration})`;
  const outroDelay = Math.round(outroStart * 1000);
  await new Promise<void>((resolve, reject) => {
    ffmpeg().input(highlights).input(intro).input(outro).complexFilter([
      `[0:a]volume=0.28:enable='${duckExpression}'[ducked]`,
      `${fitVoiceover("[1:a]", introSourceDuration, introDuration)}[intro_voice]`,
      `${fitVoiceover("[2:a]", outroSourceDuration, outroDuration)}[outro_voice]`,
      "[outro_voice]adelay=" + outroDelay + "|" + outroDelay + "[outro_delayed]",
      "[ducked][intro_voice][outro_delayed]amix=inputs=3:duration=first:dropout_transition=0[mixed]",
    ]).outputOptions(["-map", "0:v", "-map", "[mixed]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart"]).output(output).on("end", () => resolve()).on("error", reject).run();
  });
}

function fitVoiceover(input: string, sourceDuration: number, targetDuration: number): string {
  const speed = sourceDuration / Math.max(0.1, targetDuration);
  const filters: string[] = [];
  const playbackRate = Math.min(1.25, Math.max(0.8, speed));
  if (Math.abs(playbackRate - 1) > 0.01) filters.push(`atempo=${playbackRate}`);
  filters.push("asetpts=PTS-STARTPTS");
  return `${input}${filters.join(",")}`;
}

async function writeClipSubtitles(jobDir: string, index: number, clipStart: number, clipEnd: number, transcript: TranscriptSegment[]): Promise<string | null> {
  const lines = transcript.filter((segment) => segment.start < clipEnd && segment.end > clipStart).map((segment, lineIndex) => {
    const start = Math.max(clipStart, segment.start) - clipStart;
    const end = Math.min(clipEnd, segment.end) - clipStart;
    return `${lineIndex + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${segment.text.replace(/\s+/g, " ").trim()}\n`;
  });
  if (lines.length === 0) return null;
  const subtitlePath = path.join(jobDir, `clip-${index}.srt`);
  await fs.writeFile(subtitlePath, lines.join("\n"));
  return subtitlePath;
}

function toSrtTime(seconds: number): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const remainder = milliseconds % 60_000;
  const secs = Math.floor(remainder / 1000);
  const millis = remainder % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}
