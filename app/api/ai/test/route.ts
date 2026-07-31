export const runtime = "edge";

type TestRequest = {
  provider?: "ollama" | "openai" | "compatible";
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  credentialMode?: "session" | "server";
};

function safeBaseUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) AI endpoints are supported");
  return url.toString().replace(/\/$/, "");
}

async function serverKey(provider: TestRequest["provider"]) {
  const { env } = await import("cloudflare:workers");
  const bindings = env as unknown as { OPENAI_API_KEY?: string; COMPATIBLE_AI_API_KEY?: string };
  return provider === "openai" ? bindings.OPENAI_API_KEY : bindings.COMPATIBLE_AI_API_KEY;
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as TestRequest;
    const provider = input.provider || "ollama";
    const baseUrl = safeBaseUrl(input.baseUrl || (provider === "ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"));
    if (provider === "ollama") {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      return Response.json({ connected: true, detail: "Ollama is reachable and ready." });
    }

    const apiKey = input.apiKey?.trim() || (input.credentialMode === "server" ? await serverKey(provider) : "");
    if (!apiKey) return Response.json({ error: input.credentialMode === "server" ? "The server secret is not configured" : "Enter an API key for this test" }, { status: 400 });
    const path = provider === "openai" && input.model?.trim() ? `/models/${encodeURIComponent(input.model.trim())}` : "/models";
    const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${apiKey}` } });
    if (!response.ok) throw new Error(`${provider === "openai" ? "OpenAI" : "AI endpoint"} returned ${response.status}`);
    return Response.json({ connected: true, detail: `${provider === "openai" ? "OpenAI" : "Compatible AI"} connection verified.` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Connection test failed" }, { status: 500 });
  }
}
