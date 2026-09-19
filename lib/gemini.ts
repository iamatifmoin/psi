import type { TimelinePayload } from "./media-analysis";

export type DirectorClip = { start_time: number; end_time: number; label?: string; reason?: string; energy_score?: number };
export type DirectorDecision = { clips: DirectorClip[]; intro_narration: string; outro_narration: string };

export async function directHighlight(timeline: TimelinePayload): Promise<DirectorDecision> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const requestBody = {
    systemInstruction: { parts: [{ text: "You are an expert video highlight editor. Select the most engaging moments from the supplied timestamped transcript and visual timeline. Favor excitement, surprising events, strong reactions, jokes, wins, fails, and narrative clarity. Return only valid JSON. Choose 3 to 5 non-overlapping clips, each at least 3 seconds and at most 18 seconds, within the source duration. For every clip, provide one concise factual selection_reason grounded in the supplied transcript or visual timeline; do not provide hidden chain-of-thought or internal deliberation. Write concise English intro and outro narration, each no more than 2 sentences. Do not mention that you are an AI." }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(timeline) }] }],
    generationConfig: { temperature: 0.4, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { clips: { type: "ARRAY", items: { type: "OBJECT", properties: { start_time: { type: "NUMBER" }, end_time: { type: "NUMBER" }, label: { type: "STRING" }, reason: { type: "STRING" } }, required: ["start_time", "end_time", "reason"] } }, intro_narration: { type: "STRING" }, outro_narration: { type: "STRING" } }, required: ["clips", "intro_narration", "outro_narration"] } },
  };

  let response: Response | undefined;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
    if (response.ok) break;
    const body = await response.text();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) throw new Error(`Gemini director failed (${response.status}): ${extractProviderMessage(body)}`);
    await delay(attempt * 1000);
  }
  if (!response || !response.ok) throw new Error("Gemini director failed without a response.");
  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!raw) throw new Error("Gemini returned an empty director decision.");
  return normalizeDecision(JSON.parse(raw), timeline.duration);
}

function normalizeDecision(input: Partial<DirectorDecision>, duration: number): DirectorDecision {
  const clips = (input.clips ?? []).map((clip) => ({ start_time: clamp(Number(clip.start_time), 0, duration), end_time: clamp(Number(clip.end_time), 0, duration), label: clip.label?.trim(), reason: clip.reason?.trim() || "Selected as an engaging video moment." })).filter((clip) => clip.end_time - clip.start_time >= 3).sort((a, b) => a.start_time - b.start_time).filter((clip, index, all) => index === 0 || clip.start_time >= all[index - 1].end_time).slice(0, 5);
  if (clips.length === 0) clips.push({ start_time: 0, end_time: Math.min(duration, Math.max(5, duration)), label: "Opening highlight", reason: "Used as a safe fallback because no valid clip decision was returned." });
  return { clips, intro_narration: input.intro_narration?.trim() || "Here are the moments that made this video worth watching.", outro_narration: input.outro_narration?.trim() || "And that is the cut. Until the next run." };
}

function clamp(value: number, min: number, max: number): number { return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min; }

function extractProviderMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message.slice(0, 500);
  } catch {
    // Use the raw response below when Gemini does not return JSON.
  }
  return body.trim().slice(0, 500) || "The provider returned no additional details.";
}

function delay(milliseconds: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
