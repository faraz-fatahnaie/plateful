import type { AIProvider, CredentialMode } from "../../../../lib/app-settings";
import { artifactSchema, buildStudyPrompt, parseStudyArtifacts } from "../../../../lib/ai-study";
import type { AIStudyArtifacts } from "../../../../lib/playlist-study";
import { getServiceUser } from "../../../../lib/server-auth";

export const runtime = "edge";

type AnalyzeRequest = {
  provider?: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  title?: string;
  topic?: string;
  transcript?: string;
  prompt?: string;
  transcriptSource?: AIStudyArtifacts["transcriptSource"];
  credentialMode?: CredentialMode;
};

const secretNames: Partial<Record<AIProvider, string>> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  compatible: "COMPATIBLE_AI_API_KEY",
};

async function resolveApiKey(provider: AIProvider, input: AnalyzeRequest) {
  if (input.apiKey?.trim()) return input.apiKey.trim();
  if (input.credentialMode !== "server") return "";
  const { env } = await import("cloudflare:workers");
  const bindings = env as unknown as Record<string, string | undefined>;
  return bindings[secretNames[provider] || ""] || "";
}

function safeBaseUrl(value: string, fallback: string) {
  const url = new URL(value || fallback);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) AI endpoints are supported");
  return url.toString().replace(/\/$/, "");
}

function requiredKeyError(provider: AIProvider, mode?: CredentialMode) {
  const secret = secretNames[provider];
  return mode === "server" ? `${secret || "The provider secret"} is not configured on the server` : `An API key is required for ${provider}`;
}

function extractOpenAIText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
  }
  throw new Error("The AI provider returned no usable text");
}

async function callChatCompletions(input: AnalyzeRequest, provider: AIProvider, prompt: string, model: string) {
  const apiKey = await resolveApiKey(provider, input);
  const keyRequired = provider === "openrouter" || (provider === "compatible" && input.credentialMode !== "none");
  if (keyRequired && !apiKey) throw new Error(requiredKeyError(provider, input.credentialMode));
  const fallback = provider === "openrouter" ? "https://openrouter.ai/api/v1" : provider === "lmstudio" ? "http://localhost:1234/v1" : "https://api.example.com/v1";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  if (provider === "openrouter") headers["X-Title"] = "Plateful";
  const response = await fetch(`${safeBaseUrl(input.baseUrl || "", fallback)}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`${provider} returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content || "";
}

export async function POST(request: Request) {
  try {
    if (!await getServiceUser(request)) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const input = (await request.json()) as AnalyzeRequest;
    if (!input.transcript?.trim()) return Response.json({ error: "A transcript is required before AI analysis" }, { status: 400 });
    const provider = input.provider || "ollama";
    if (provider === "chatgpt") return Response.json({ error: "ChatGPT accounts use the manual copy, open, and import workflow" }, { status: 400 });
    const customPrompt = input.prompt?.trim() || "";
    if (customPrompt.length > 80000) return Response.json({ error: "The customized prompt is too long" }, { status: 400 });
    const prompt = customPrompt || buildStudyPrompt(input);
    const defaults: Partial<Record<AIProvider, string>> = { openai: "gpt-5.6-luna", anthropic: "claude-sonnet-4-5", gemini: "gemini-2.5-flash", openrouter: "openai/gpt-4.1-mini", ollama: "gemma3" };
    const model = input.model?.trim() || defaults[provider] || "";
    if (!model) return Response.json({ error: "Enter a model ID" }, { status: 400 });
    let responseText = "";

    if (provider === "ollama") {
      const baseUrl = safeBaseUrl(input.baseUrl || "", "http://localhost:11434");
      const response = await fetch(`${baseUrl}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, stream: false, format: artifactSchema, messages: [{ role: "user", content: prompt }], options: { temperature: 0.1 } }) });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      responseText = ((await response.json()) as { message?: { content?: string } }).message?.content || "";
    } else if (provider === "openai") {
      const apiKey = await resolveApiKey(provider, input);
      if (!apiKey) return Response.json({ error: requiredKeyError(provider, input.credentialMode) }, { status: 400 });
      const response = await fetch(`${safeBaseUrl(input.baseUrl || "", "https://api.openai.com/v1")}/responses`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, store: false, input: prompt, text: { format: { type: "json_schema", name: "study_artifacts", strict: true, schema: artifactSchema } } }) });
      if (!response.ok) throw new Error(`OpenAI returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
      responseText = extractOpenAIText((await response.json()) as Record<string, unknown>);
    } else if (provider === "anthropic") {
      const apiKey = await resolveApiKey(provider, input);
      if (!apiKey) return Response.json({ error: requiredKeyError(provider, input.credentialMode) }, { status: 400 });
      const response = await fetch(`${safeBaseUrl(input.baseUrl || "", "https://api.anthropic.com")}/v1/messages`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 4096, temperature: 0.1, messages: [{ role: "user", content: prompt }] }) });
      if (!response.ok) throw new Error(`Anthropic returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
      const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
      responseText = payload.content?.filter((item) => item.type === "text").map((item) => item.text || "").join("") || "";
    } else if (provider === "gemini") {
      const apiKey = await resolveApiKey(provider, input);
      if (!apiKey) return Response.json({ error: requiredKeyError(provider, input.credentialMode) }, { status: 400 });
      const baseUrl = safeBaseUrl(input.baseUrl || "", "https://generativelanguage.googleapis.com/v1beta");
      const response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }) });
      if (!response.ok) throw new Error(`Gemini returned ${response.status}: ${(await response.text()).slice(0, 180)}`);
      const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      responseText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    } else {
      responseText = await callChatCompletions(input, provider, prompt, model);
    }

    const artifacts: AIStudyArtifacts = { ...parseStudyArtifacts(responseText), provider, model, generatedAt: new Date().toISOString(), transcriptSource: input.transcriptSource || "pasted" };
    return Response.json({ artifacts });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI analysis failed" }, { status: 500 });
  }
}
