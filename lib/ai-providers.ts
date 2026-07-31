import type { AIConnection, AIProvider, CredentialMode } from "./app-settings";

export type AIProviderGroup = "account" | "cloud" | "local" | "custom";
export type AIProviderAuth = "manual" | "api-key" | "none" | "optional-key";

export type AIProviderDefinition = {
  id: AIProvider;
  label: string;
  shortLabel: string;
  group: AIProviderGroup;
  auth: AIProviderAuth;
  mode: "manual" | "automatic";
  description: string;
  defaultName: string;
  defaultModel: string;
  defaultBaseUrl: string;
  serverSecret?: string;
  docsUrl: string;
};

export const AI_PROVIDER_CATALOG: AIProviderDefinition[] = [
  { id: "chatgpt", label: "ChatGPT account", shortLabel: "ChatGPT", group: "account", auth: "manual", mode: "manual", description: "Use your signed-in ChatGPT plan with a copy, open, and import handoff.", defaultName: "My ChatGPT", defaultModel: "My ChatGPT model", defaultBaseUrl: "https://chatgpt.com", docsUrl: "https://chatgpt.com" },
  { id: "openai", label: "OpenAI API", shortLabel: "OpenAI", group: "cloud", auth: "api-key", mode: "automatic", description: "Automated study packs through the OpenAI Responses API.", defaultName: "OpenAI API", defaultModel: "gpt-5.6-luna", defaultBaseUrl: "https://api.openai.com/v1", serverSecret: "OPENAI_API_KEY", docsUrl: "https://platform.openai.com/docs" },
  { id: "anthropic", label: "Anthropic API", shortLabel: "Anthropic", group: "cloud", auth: "api-key", mode: "automatic", description: "Connect Claude models with an Anthropic API key.", defaultName: "Anthropic Claude", defaultModel: "claude-sonnet-4-5", defaultBaseUrl: "https://api.anthropic.com", serverSecret: "ANTHROPIC_API_KEY", docsUrl: "https://docs.anthropic.com/en/api/messages" },
  { id: "gemini", label: "Google Gemini API", shortLabel: "Gemini", group: "cloud", auth: "api-key", mode: "automatic", description: "Connect Gemini models with a Google AI API key.", defaultName: "Google Gemini", defaultModel: "gemini-2.5-flash", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta", serverSecret: "GEMINI_API_KEY", docsUrl: "https://ai.google.dev/gemini-api/docs" },
  { id: "openrouter", label: "OpenRouter API", shortLabel: "OpenRouter", group: "cloud", auth: "api-key", mode: "automatic", description: "Use one API connection to select among many model providers.", defaultName: "OpenRouter", defaultModel: "openai/gpt-4.1-mini", defaultBaseUrl: "https://openrouter.ai/api/v1", serverSecret: "OPENROUTER_API_KEY", docsUrl: "https://openrouter.ai/docs/quickstart" },
  { id: "ollama", label: "Ollama (local)", shortLabel: "Ollama", group: "local", auth: "none", mode: "automatic", description: "Run private, no-cloud analysis on a local Ollama server.", defaultName: "Local Ollama", defaultModel: "gemma3", defaultBaseUrl: "http://localhost:11434", docsUrl: "https://ollama.com" },
  { id: "lmstudio", label: "LM Studio (local)", shortLabel: "LM Studio", group: "local", auth: "optional-key", mode: "automatic", description: "Use LM Studio's local OpenAI-compatible server.", defaultName: "Local LM Studio", defaultModel: "", defaultBaseUrl: "http://localhost:1234/v1", docsUrl: "https://lmstudio.ai/docs/developer" },
  { id: "compatible", label: "Custom OpenAI-compatible", shortLabel: "Custom", group: "custom", auth: "optional-key", mode: "automatic", description: "Connect another service that implements OpenAI-style chat completions.", defaultName: "Custom AI", defaultModel: "", defaultBaseUrl: "https://api.example.com/v1", serverSecret: "COMPATIBLE_AI_API_KEY", docsUrl: "" },
];

export const AI_PROVIDER_GROUP_LABELS: Record<AIProviderGroup, string> = {
  account: "Account-assisted",
  cloud: "Cloud APIs",
  local: "Local models",
  custom: "Custom endpoint",
};

export function getAIProvider(provider: AIProvider) {
  return AI_PROVIDER_CATALOG.find((item) => item.id === provider) || AI_PROVIDER_CATALOG[0];
}

export function providerDefaults(provider: AIProvider): Pick<AIConnection, "provider" | "model" | "baseUrl" | "credentialMode"> {
  const definition = getAIProvider(provider);
  const credentialMode: CredentialMode = definition.auth === "api-key" ? "session" : "none";
  return { provider, model: definition.defaultModel, baseUrl: definition.defaultBaseUrl, credentialMode };
}

export function providerNeedsKey(provider: AIProvider) {
  return getAIProvider(provider).auth === "api-key";
}

export function providerAllowsKey(provider: AIProvider) {
  return ["api-key", "optional-key"].includes(getAIProvider(provider).auth);
}
