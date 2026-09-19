export { directHighlight } from "./gemini";
export type { DirectorDecision } from "./gemini";

// Kept temporarily so the retired asset helpers remain type-checkable while
// the new video pipeline replaces them incrementally.
export type AudioMood = "hype" | "chaotic" | "wholesome" | "dramatic" | "deadpan";
