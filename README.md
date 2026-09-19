# AI Director's Cut

Local web app that turns a short gameplay MP4 into an AI-directed highlight reel.

The pipeline extracts speech, scans visual scene changes, asks Gemini to select the strongest moments and write narration, uses ElevenLabs for voiceover, and assembles the final MP4 with FFmpeg.

## Start locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create `.env.local` from `.env.example` and add:

```text
GEMINI_API_KEY=
GROQ_API_KEY=
ELEVENLABS_API_KEY=
```

Optional model settings are also documented in `.env.example`.

## Local requirement

No separate FFmpeg installation is required for the normal Node workflow; the project uses the bundled `ffmpeg-static` binary. Use short English MP4 gameplay videos, ideally under two minutes and 250 MB.

## Demo flow

1. Upload an MP4.
2. Click `Generate highlight`.
3. Wait for transcription, visual scanning, AI direction, narration, and rendering.
4. Play the original and generated videos side by side.
5. Use transcript and selected-clip timestamps to seek.
6. Download the final MP4.

See `REQUIREMENTS.md`, `ARCHITECTURE.md`, `MIGRATION_PLAN.md`, and `DEMO_RUNBOOK.md` for the planning and handoff details.
