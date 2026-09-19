import fs from "node:fs";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

/** Point fluent-ffmpeg at the bundled binary (required on Vercel; harmless locally). */
const localFfmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
export const FFMPEG_PATH = fs.existsSync(localFfmpegPath) ? localFfmpegPath : (ffmpegStatic || "ffmpeg");

ffmpeg.setFfmpegPath(FFMPEG_PATH);
