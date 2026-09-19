# AI Director's Cut — Migration Plan

## Existing code to reuse

- `app/` App Router structure.
- `app/globals.css` visual theme and Tailwind setup.
- `lib/ffmpeg-config.ts` bundled FFmpeg configuration.
- `lib/render.ts` filesystem, FFmpeg command, timeout, and cleanup patterns.
- `lib/api-errors.ts` and toast notification conventions.
- Existing environment-variable and server-only provider patterns.
- Existing Next.js scripts and dependency setup.

## Existing code to retire or repurpose

- `components/Chat.tsx`: replace with upload/studio interface.
- `app/api/generate-video/route.ts`: replace product scraping and stock-asset orchestration with media pipeline orchestration.
- `lib/director.ts`: replace product/social-video schema with video timeline/director schema.
- `lib/render.ts`: refactor from stock/GIF compositing into source clip slicing, narration insertion, and ducking.
- `lib/anthropic.ts`: replace or generalize as a Gemini client helper.
- `lib/scrape.ts`, Pexels, and Giphy helpers: remove from the active path; delete only after confirming no remaining imports.
- Product-specific copy, badges, and branding in the UI.

## Vertical-slice implementation order

### Slice 1 — Upload and playback

- Replace chat input with MP4 picker/drop zone.
- Save uploaded file server-side.
- Return a playable local source URL.
- Confirm the original video renders in the browser.

### Slice 2 — Transcript

- Extract a compact audio file with FFmpeg.
- Call Groq Whisper for timestamped English segments.
- Display transcript segments in the UI.

### Slice 3 — Director JSON

- Add visual metadata extraction.
- Build the unified timeline payload.
- Call Gemini with strict JSON instructions.
- Validate and normalize selected ranges.
- Display selected clip timestamps and scripts.

### Slice 4 — Render

- Slice and concatenate source ranges with FFmpeg.
- Generate intro/outro audio with ElevenLabs.
- Mix narration and audio with ducking.
- Return a playable final MP4.

### Slice 5 — Studio polish

- Wire staged loading UI.
- Add original/result side-by-side layout.
- Add timestamp seeking.
- Add final-video download.
- Improve error toasts and empty states.

## Explicit deferrals

Do not spend MVP time on:

- Background-music search or generation.
- Captions/subtitle burning.
- Visual overlays and transitions.
- Job queues or WebSockets.
- SQLite persistence.
- Provider selection UI.
- Multi-video projects.

## Minimal verification

Only verify the vertical path:

1. App starts with the documented commands.
2. A sample MP4 uploads and previews.
3. Transcript segments contain timestamps.
4. Director output parses as valid bounded clip ranges.
5. Final MP4 exists and plays.
6. Narration is audible and source audio ducks during narration.
7. A second sample video does not rely on hardcoded timestamps.
