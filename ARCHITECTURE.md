# AI Director's Cut — Architecture

## Architectural direction

Reuse the existing Next.js 16 + TypeScript application and its server-side FFmpeg pipeline. The old product-video workflow is replaced with a local uploaded-media workflow while preserving the existing modular server boundaries and UI styling approach.

Python is intentionally excluded from the MVP to reduce setup time and avoid a second runtime.

## Runtime components

### Frontend

- Next.js App Router.
- React client component for upload, preview, progress, transcript, and result playback.
- Existing Tailwind CSS theme can be adapted rather than replaced.
- Original and generated videos use native HTML video elements.

### Backend

- Next.js Node.js route for multipart upload and synchronous orchestration.
- Single in-memory active-job state for the local MVP.
- Temporary files under a job-specific directory.
- Final MP4 under a local public/generated directory or equivalent existing output path.

### Media layer

- Existing `fluent-ffmpeg` and `ffmpeg-static` integration.
- FFmpeg/ffprobe for metadata, audio extraction, scene sampling, slicing, concatenation, audio mixing, and encoding.
- No new Python process.

### AI services

- Gemini: creative-director decision and narration script generation.
- Groq Whisper: timestamped English speech transcription.
- ElevenLabs: intro/outro text-to-speech.

All credentials remain server-side and are read only from environment variables.

## Proposed internal data model

```ts
type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

type VisualObservation = {
  time: number;
  score: number;
  kind: "scene_change" | "visual_energy";
};

type TimelinePayload = {
  duration: number;
  transcript: TranscriptSegment[];
  visuals: VisualObservation[];
};

type DirectorDecision = {
  clips: Array<{
    start_time: number;
    end_time: number;
    label?: string;
  }>;
  intro_narration: string;
  outro_narration: string;
};
```

The actual implementation may refine names, but the boundaries should remain stable between analysis, directing, and rendering.

## Request flow

```text
Browser upload
  -> multipart Next.js route
  -> validate and save source MP4
  -> ffprobe metadata
  -> FFmpeg audio extraction
  -> Groq timestamped transcription
  -> FFmpeg visual/scene analysis
  -> unified timeline payload
  -> Gemini structured director decision
  -> ElevenLabs intro/outro audio
  -> FFmpeg clip assembly and audio ducking
  -> JSON response with result URL, transcript, clips, scripts
  -> browser playback/download
```

## Provider configuration

Expected environment variables:

```text
GEMINI_API_KEY=
GROQ_API_KEY=
ELEVENLABS_API_KEY=
```

Provider model IDs should be centralized in server-side helper modules so they can be changed without touching route or UI code.

## Important implementation constraints

- Do not expose API keys to client bundles.
- Do not trust LLM timestamps blindly; clamp, validate, sort, de-duplicate, and reject invalid ranges before FFmpeg.
- Keep all temporary paths within a generated job directory.
- Use bounded source duration/file-size checks for predictable demo behavior.
- Keep the orchestration route thin; put provider calls, analysis, and rendering in separate modules.
