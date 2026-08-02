import type { AIProvider, CredentialMode } from "../../../../lib/app-settings";
import { getAIProvider } from "../../../../lib/ai-providers";
import { getServiceUser } from "../../../../lib/server-auth";

export const runtime = "edge";

type TestRequest = { provider?: AIProvider; model?: string; baseUrl?: string; apiKey?: string; credentialMode?: CredentialMode };
const secretNames: Partial<Record<AIProvider, string>> = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", openrouter: "OPENROUTER_API_KEY", compatible: "COMPATIBLE_AI_API_KEY" };

function safeBaseUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) AI endpoints are supported");
  return url.toString().replace(/\/$/, "");
}

async function serverKey(provider: AIProvider) {
  const { env } = await import("cloudflare:workers");
  const bindings = env as unknown as Record<string, string | undefined>;
  return bindings[secretNames[provider] || ""] || "";
}

export async function POST(request: Request) {
  try {
    if (!await getServiceUser(request)) return Response.json({ error: "Sign in is required" }, { status: 401 });
    const input = (await request.json()) as TestRequest;
    const provider = input.provider || "ollama";
    const definition = getAIProvider(provider);
    if (definition.mode === "manual") return Response.json({ connected: true, detail: `${definition.shortLabel} manual handoff is ready. No password, cookie, or API key is needed.` });
    const baseUrl = safeBaseUrl(input.baseUrl || definition.defaultBaseUrl);
    if (provider === "ollama") {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      return Response.json({ connected: true, detail: "Ollama is reachable and ready." });
    }
    const apiKey = input.apiKey?.trim() || (input.credentialMode === "server" ? await serverKey(provider) : "");
    if (definition.auth === "api-key" && !apiKey) return Response.json({ error: input.credentialMode === "server" ? `${definition.serverSecret} is not configured` : "Enter an API key for this test" }, { status: 400 });
    const headers: Record<string, string> = {};
    let url = `${baseUrl}/models`;
    if (provider === "anthropic") { url = `${baseUrl}/v1/models`; if (apiKey) { headers["x-api-key"] = apiKey; headers["anthropic-version"] = "2023-06-01"; } }
    else if (provider === "gemini") { url = `${baseUrl}/models`; if (apiKey) headers["x-goog-api-key"] = apiKey; }
    else if (provider === "openai" && input.model?.trim()) url = `${baseUrl}/models/${encodeURIComponent(input.model.trim())}`;
    if (apiKey && !headers["x-api-key"] && !headers["x-goog-api-key"]) headers.authorization = `Bearer ${apiKey}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`${definition.shortLabel} returned ${response.status}`);
    return Response.json({ connected: true, detail: `${definition.shortLabel} connection verified.` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Connection test failed" }, { status: 500 });
  }
}
