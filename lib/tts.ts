import fs from "node:fs/promises";

export async function synthesizeSpeech(text: string, outputPath: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured.");
  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, { method: "POST", headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5", output_format: "mp3_44100_128" }) });
  if (!response.ok) {
    const responseBody = await response.text();
    const providerMessage = extractProviderMessage(responseBody);
    throw new Error(`ElevenLabs narration failed (${response.status}): ${providerMessage}`);
  }
  await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
}

function extractProviderMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; message?: unknown; error?: unknown };
    const detail = typeof parsed.detail === "string" ? parsed.detail : parsed.detail && typeof parsed.detail === "object" ? JSON.stringify(parsed.detail) : undefined;
    const message = [detail, parsed.message, parsed.error].find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (message) return message.slice(0, 500);
  } catch {
    // Fall through to the raw response text when it is not JSON.
  }
  return body.trim().slice(0, 500) || "The provider returned no additional details.";
}
