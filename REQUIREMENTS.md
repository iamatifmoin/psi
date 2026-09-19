# AI Director's Cut — MVP Requirements

## Objective

Transform a short raw gameplay MP4 into a concise highlight reel using transcript-aware AI clip selection, FFmpeg rendering, and AI voice narration.

The priority is a reliable end-to-end local demo, not production scale.

## Confirmed scope

- Local web application running on `localhost`.
- One local user and one active processing job.
- English gameplay videos only for the first MVP.
- MP4 input only.
- Short source videos; test files are expected to remain below the speech API limits.
- User uploads a video, then explicitly starts generation.
- Processing may be synchronous/blocking for the MVP.
- API providers are configured through environment variables.
- External APIs are allowed.
- Final output can be downloaded as an MP4.
- No authentication, multi-user support, job queue, or public API is required.

## Required user flow

1. Upload an MP4.
2. Preview the original video.
3. Click `Generate Highlight`.
4. Show staged progress:
   - Uploading/Preparing
   - Analyzing Audio
   - Scanning Visuals
   - Consulting AI Director
   - Writing Narration
   - Rendering Highlight
5. Show the generated highlight reel beside the original.
6. Show the generated intro/outro script.
7. Show the timestamped transcript.
8. Allow transcript timestamps to seek the original video.
9. Allow selected-clip timestamps to seek the generated video.
10. Allow downloading the final MP4.

## Media analysis

The backend must:

- Validate that the upload is an MP4.
- Extract duration and basic media metadata.
- Extract a speech-friendly audio file with FFmpeg.
- Transcribe speech with timestamped segments.
- Produce lightweight visual metadata using FFmpeg scene/visual-energy sampling.
- Combine transcript and visual observations into one internal timeline payload.

## Creative director output

The LLM receives the transcript and timeline metadata and must return strict JSON containing:

- 3–5 selected clips.
- Each clip's `start_time` and `end_time`.
- A short purpose/label for each clip, if useful to the UI.
- Intro narration text.
- Outro narration text.

The UI will not expose private chain-of-thought or verbose selection reasoning.

Clip selection should favor gameplay moments with spoken excitement, strong language/emotion, sudden changes, high visual activity, or meaningful narrative context.

## Rendering

- Concatenate the selected source ranges into one highlight video.
- Add intro narration before the highlights.
- Add outro narration after the highlights.
- Keep source gameplay audio during clips.
- Duck source audio substantially while narration plays and restore it afterward.
- Normalize output to a practical MVP format, likely H.264/AAC MP4.
- Background music, subtitles, visual overlays, and transitions are deferred unless they are nearly free after the vertical slice works.

## Error behavior

- Display user-facing failures through the existing toast pattern.
- Fail clearly for unsupported file type, missing provider configuration, transcription failure, invalid LLM JSON, and FFmpeg errors.
- Clean temporary job files after success or failure.
- Retain the final generated video for the current local session.

## Non-goals

- Python/OpenCV runtime.
- Offline model fallback.
- Multiple simultaneous jobs.
- Persistent project history.
- Authentication.
- Cloud deployment.
- Background-music matching in the first vertical slice.
- Caption burning or decorative overlays in the first vertical slice.
