import type { AIProvider, CredentialMode } from "../../../../lib/app-settings";
import { getAIProvider } from "../../../../lib/ai-providers";
import { buildTopicClassificationPrompt, parseTopicClassifications, topicClassificationSchema } from "../../../../lib/topic-organization";
import type { StudyVideo } from "../../../../lib/playlist-study";
import { getServiceUser } from "../../../../lib/server-auth";

export const runtime = "edge";

type TopicRequest = {
  provider?: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  credentialMode?: CredentialMode;
  title?: string;
  videos?: Array<Pick<StudyVideo, "id" | "index" | "title" | "publisherTopic" | "topic">>;
};

const secretNames: Partial<Record<AIProvider, string>> = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", openrouter: "OPENROUTER_API_KEY", compatible: "COMPATIBLE_AI_API_KEY" };

function safeBaseUrl(value: string, fallback: string) {
  const url = new URL(value || fallback);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) AI endpoints are supported");
  return url.toString().replace(/\/$/, "");
}

async function resolveKey(provider: AIProvider, input: TopicRequest) {
  if (input.apiKey?.trim()) return input.apiKey.trim();
  if (input.credentialMode !== "server") return "";
  const { env } = await import("cloudflare:workers");
  const bindings = env as unknown as Record<string, string | undefined>;
  return bindings[secretNames[provider] || ""] || "";
}

function openAIText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) if (item && typeof item === "object") {
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
  }
  throw new Error("The AI provider returned no usable text");
}

async function chatCompletion(input: TopicRequest, provider: AIProvider, prompt: string, model: string) {
  const definition = getAIProvider(provider);
  const key = await resolveKey(provider, input);
  if (definition.auth === "api-key" && !key) throw new Error(input.credentialMode === "server" ? `${definition.serverSecret} is not configured` : `An API key is required for ${definition.shortLabel}`);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers.authorization = `Bearer ${key}`;
  if (provider === "openrouter") headers["X-Title"] = "Plateful";
  const response = await fetch(`${safeBaseUrl(input.baseUrl || "", definition.defaultBaseUrl)}/chat/completions`, { method: "POST", headers, body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
  if (!response.ok) throw new Error(`${definition.shortLabel} returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content || "";
}

export async function POST(request: Request) {
  try {
    if (!await getServiceUser(request)) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const input = (await request.json()) as TopicRequest;
    const videos = (input.videos || []).slice(0, 500);
    if (!videos.length) return Response.json({ error: "A verified video inventory is required" }, { status: 400 });
    const provider = input.provider || "ollama";
    if (getAIProvider(provider).mode === "manual") return Response.json({ error: `${getAIProvider(provider).shortLabel} uses the copy, open, and import workflow` }, { status: 400 });
    const definition = getAIProvider(provider);
    const model = input.model?.trim() || definition.defaultModel;
    if (!model) return Response.json({ error: "Enter a model ID" }, { status: 400 });
    const prompt = buildTopicClassificationPrompt(input.title || "Untitled playlist", videos);
    let text = "";

    if (provider === "ollama") {
      const response = await fetch(`${safeBaseUrl(input.baseUrl || "", definition.defaultBaseUrl)}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, stream: false, format: topicClassificationSchema, messages: [{ role: "user", content: prompt }], options: { temperature: 0.1 } }) });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      text = ((await response.json()) as { message?: { content?: string } }).message?.content || "";
    } else if (provider === "openai") {
      const key = await resolveKey(provider, input);
      if (!key) return Response.json({ error: input.credentialMode === "server" ? "OPENAI_API_KEY is not configured" : "An OpenAI API key is required" }, { status: 400 });
      const response = await fetch(`${safeBaseUrl(input.baseUrl || "", definition.defaultBaseUrl)}/responses`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, store: false, input: prompt, text: { format: { type: "json_schema", name: "playlist_topics", strict: true, schema: topicClassificationSchema } } }) });
      if (!response.ok) throw new Error(`OpenAI returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
      text = openAIText((await response.json()) as Record<string, unknown>);
    } else if (provider === "anthropic") {
      const key = await resolveKey(provider, input);
      if (!key) return Response.json({ error: input.credentialMode === "server" ? "ANTHROPIC_API_KEY is not configured" : "An Anthropic API key is required" }, { status: 400 });
      const response = await fetch(`${safeBaseUrl(input.baseUrl || "", definition.defaultBaseUrl)}/v1/messages`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 4096, temperature: 0.1, messages: [{ role: "user", content: prompt }] }) });
      if (!response.ok) throw new Error(`Anthropic returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
      const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
      text = payload.content?.filter((item) => item.type === "text").map((item) => item.text || "").join("") || "";
    } else if (provider === "gemini") {
      const key = await resolveKey(provider, input);
      if (!key) return Response.json({ error: input.credentialMode === "server" ? "GEMINI_API_KEY is not configured" : "A Gemini API key is required" }, { status: 400 });
      const response = await fetch(`${safeBaseUrl(input.baseUrl || "", definition.defaultBaseUrl)}/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }) });
      if (!response.ok) throw new Error(`Gemini returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
      const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    } else text = await chatCompletion(input, provider, prompt, model);

    const topics = parseTopicClassifications(text, videos.map((video) => video.id));
    return Response.json({ topics, provider, model });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI topic classification failed" }, { status: 500 });
  }
}
