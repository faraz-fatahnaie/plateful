import type { AIStudyArtifacts } from "../../../../lib/playlist-study";

export const runtime = "edge";

const artifactSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    commands: { type: "array", items: { type: "string" } },
    mindMap: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          children: { type: "array", items: { type: "string" } },
        },
        required: ["label", "children"],
      },
    },
    practice: { type: "array", items: { type: "string" } },
    quiz: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
      },
    },
  },
  required: ["summary", "keyPoints", "commands", "mindMap", "practice", "quiz"],
} as const;

type AnalyzeRequest = {
  provider?: "openai" | "ollama" | "compatible";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  title?: string;
  topic?: string;
  transcript?: string;
  transcriptSource?: AIStudyArtifacts["transcriptSource"];
};

function safeBaseUrl(value: string, fallback: string) {
  const url = new URL(value || fallback);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only HTTP(S) AI endpoints are supported");
  return url.toString().replace(/\/$/, "");
}

function studyPrompt(request: AnalyzeRequest) {
  return [
    "You are a careful study-note editor.",
    "Analyze only the supplied transcript. Do not invent commands, facts, or video content.",
    "Create a concise summary, 5-8 key points, exact commands only when present, a 3-6 branch mind map, practical exercises, and 3 short quiz questions with answers.",
    "Return JSON matching the supplied schema.",
    `Video: ${request.title || "Untitled"}`,
    `Topic: ${request.topic || "Uncategorized"}`,
    "Transcript:",
    (request.transcript || "").slice(0, 60000),
  ].join("\n\n");
}

function extractOpenAIText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  throw new Error("The AI provider returned no usable text");
}

function parseArtifacts(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as Omit<AIStudyArtifacts, "provider" | "model" | "generatedAt" | "transcriptSource">;
  if (!parsed.summary || !Array.isArray(parsed.keyPoints) || !Array.isArray(parsed.mindMap)) {
    throw new Error("The AI response did not match the study-artifact format");
  }
  return parsed;
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as AnalyzeRequest;
    if (!input.transcript?.trim()) {
      return Response.json({ error: "A transcript is required before AI analysis" }, { status: 400 });
    }

    const provider = input.provider || "ollama";
    const prompt = studyPrompt(input);
    let responseText = "";
    const model = input.model?.trim() || (provider === "openai" ? "gpt-5.6-luna" : "gemma3");

    if (provider === "ollama") {
      const baseUrl = safeBaseUrl(input.baseUrl || "", "http://localhost:11434");
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: artifactSchema,
          messages: [{ role: "user", content: prompt }],
          options: { temperature: 0.1 },
        }),
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const payload = (await response.json()) as { message?: { content?: string } };
      responseText = payload.message?.content || "";
    } else if (provider === "openai") {
      if (!input.apiKey?.trim()) return Response.json({ error: "An OpenAI API key is required" }, { status: 400 });
      const baseUrl = safeBaseUrl(input.baseUrl || "", "https://api.openai.com/v1");
      const response = await fetch(`${baseUrl}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${input.apiKey.trim()}` },
        body: JSON.stringify({
          model,
          store: false,
          input: prompt,
          text: { format: { type: "json_schema", name: "study_artifacts", strict: true, schema: artifactSchema } },
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`OpenAI returned ${response.status}: ${detail.slice(0, 180)}`);
      }
      responseText = extractOpenAIText((await response.json()) as Record<string, unknown>);
    } else {
      if (!input.apiKey?.trim()) return Response.json({ error: "An API key is required" }, { status: 400 });
      const baseUrl = safeBaseUrl(input.baseUrl || "", "https://api.openai.com/v1");
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${input.apiKey.trim()}` },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) throw new Error(`AI endpoint returned ${response.status}`);
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      responseText = payload.choices?.[0]?.message?.content || "";
    }

    const artifacts: AIStudyArtifacts = {
      ...parseArtifacts(responseText),
      provider,
      model,
      generatedAt: new Date().toISOString(),
      transcriptSource: input.transcriptSource || "pasted",
    };
    return Response.json({ artifacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
