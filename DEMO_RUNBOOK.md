# AI Director's Cut — Demo Runbook

## Before the demo

1. Install dependencies with `npm install`.
2. Confirm FFmpeg is available through the existing bundled configuration.
3. Create `.env.local` from `.env.example`.
4. Add the Gemini, Groq, and ElevenLabs keys locally. Never commit this file.
5. Place two short gameplay MP4s where they are easy to select.
6. Run one complete generation before presenting.
7. Confirm the final MP4 download works.

## Startup

The final README must document exactly two commands, expected to be equivalent to:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Presentation flow

1. Open the AI Director's Cut studio.
2. Drop in the gameplay MP4.
3. Show the original preview and file metadata.
4. Click `Generate Highlight`.
5. Let the staged progress labels communicate the pipeline.
6. Explain that the system transcribes speech, scans visual activity, and asks the AI director to select moments.
7. Show the original and generated videos side by side.
8. Play the generated intro, selected highlights, and outro.
9. Click a transcript timestamp to seek the original.
10. Click a selected-clip timestamp to seek the generated video.
11. Show the generated narration script.
12. Download the final MP4.

## Backup plan

- Keep a previously generated MP4 available in the local output directory.
- If a provider rate limit occurs, explain that the pipeline is provider-backed and show the already-rendered result.
- If the first sample produces weak selections, use the second gameplay sample rather than changing code during the demo.

## Demo acceptance checklist

- [ ] Local app starts successfully.
- [ ] MP4 upload works.
- [ ] Original video plays.
- [ ] Progress states change visibly.
- [ ] Timestamped transcript appears.
- [ ] AI director returns 3–5 valid ranges.
- [ ] Intro and outro scripts appear.
- [ ] Generated video plays.
- [ ] Narration is audible.
- [ ] Original audio is ducked during narration.
- [ ] Timestamp seeking works.
- [ ] Final MP4 downloads.
