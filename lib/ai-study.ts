import type { AIStudyArtifacts } from "./playlist-study";

export const artifactSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    commands: { type: "array", items: { type: "string" } },
    mindMap: { type: "array", items: { type: "object", additionalProperties: false, properties: { label: { type: "string" }, children: { type: "array", items: { type: "string" } } }, required: ["label", "children"] } },
    practice: { type: "array", items: { type: "string" } },
    quiz: { type: "array", items: { type: "object", additionalProperties: false, properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } },
  },
  required: ["summary", "keyPoints", "commands", "mindMap", "practice", "quiz"],
} as const;

type StudyInput = { title?: string; topic?: string; transcript?: string };
type ArtifactBody = Omit<AIStudyArtifacts, "provider" | "model" | "generatedAt" | "transcriptSource">;

export type StudyPromptPresetId = "complete" | "summary" | "key-points" | "mind-map" | "practice";

export const STUDY_PROMPT_PRESETS: Array<{ id: StudyPromptPresetId; label: string; description: string; instruction: string }> = [
  { id: "complete", label: "Complete study pack", description: "Balanced summary, map, practice, and quiz", instruction: "Balance every part of the study pack." },
  { id: "summary", label: "Clear summary", description: "Explain the lesson in a compact, memorable way", instruction: "Prioritize a clear, self-contained summary. Keep secondary sections useful but concise." },
  { id: "key-points", label: "Important points", description: "Extract facts, commands, warnings, and takeaways", instruction: "Prioritize the most important points, exact commands, prerequisites, warnings, and common mistakes." },
  { id: "mind-map", label: "Mind map", description: "Organize the topic into connected branches", instruction: "Prioritize a structured mind map with meaningful branches and short, specific child nodes." },
  { id: "practice", label: "Practice & quiz", description: "Turn the episode into active recall", instruction: "Prioritize practical exercises and quiz questions that test understanding rather than recognition." },
];

export function buildStudyPrompt(input: StudyInput, preset: StudyPromptPresetId = "complete") {
  const selectedPreset = STUDY_PROMPT_PRESETS.find((item) => item.id === preset) || STUDY_PROMPT_PRESETS[0];
  return [
    "You are a careful study-note editor.",
    "Analyze only the supplied transcript. Do not invent commands, facts, or video content.",
    `Focus for this run: ${selectedPreset.instruction}`,
    "Create a concise summary, 5-8 key points, exact commands only when present, a 3-6 branch mind map, practical exercises, and 3 short quiz questions with answers.",
    "Return only valid JSON with these keys: summary, keyPoints, commands, mindMap, practice, quiz.",
    'mindMap items must be {"label":"...","children":["..."]}; quiz items must be {"question":"...","answer":"..."}.',
    `Video: ${input.title || "Untitled"}`,
    `Topic: ${input.topic || "Uncategorized"}`,
    "Transcript:",
    (input.transcript || "").slice(0, 60000),
  ].join("\n\n");
}

function stringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`AI response field '${field}' must be a string array`);
  return value as string[];
}

export function parseStudyArtifacts(text: string): ArtifactBody {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const value = JSON.parse(cleaned) as Record<string, unknown>;
  if (typeof value.summary !== "string") throw new Error("AI response field 'summary' must be text");
  const mindMap = Array.isArray(value.mindMap) ? value.mindMap.map((item) => {
    if (!item || typeof item !== "object" || typeof (item as { label?: unknown }).label !== "string") throw new Error("AI response contains an invalid mind-map branch");
    return { label: (item as { label: string }).label, children: stringArray((item as { children?: unknown }).children, "mindMap.children") };
  }) : (() => { throw new Error("AI response field 'mindMap' must be an array"); })();
  const quiz = Array.isArray(value.quiz) ? value.quiz.map((item) => {
    if (!item || typeof item !== "object" || typeof (item as { question?: unknown }).question !== "string" || typeof (item as { answer?: unknown }).answer !== "string") throw new Error("AI response contains an invalid quiz item");
    return { question: (item as { question: string }).question, answer: (item as { answer: string }).answer };
  }) : (() => { throw new Error("AI response field 'quiz' must be an array"); })();
  return { summary: value.summary, keyPoints: stringArray(value.keyPoints, "keyPoints"), commands: stringArray(value.commands, "commands"), mindMap, practice: stringArray(value.practice, "practice"), quiz };
}
