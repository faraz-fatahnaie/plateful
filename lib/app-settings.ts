export type AIProvider = "chatgpt" | "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "lmstudio" | "compatible";
export type CredentialMode = "none" | "session" | "server";

export const AI_PROVIDERS: readonly AIProvider[] = ["chatgpt", "openai", "anthropic", "gemini", "openrouter", "ollama", "lmstudio", "compatible"];
export const CREDENTIAL_MODES: readonly CredentialMode[] = ["none", "session", "server"];

export type AIConnection = {
  id: string;
  name: string;
  provider: AIProvider;
  model: string;
  baseUrl: string;
  credentialMode: CredentialMode;
  enabled: boolean;
  updatedAt: string;
};

export type AppSettings = {
  schemaVersion: 1;
  displayName: string;
  timezone: string;
  defaultStudyTime: string;
  weekStartsOn: "saturday" | "sunday" | "monday";
  theme: "system" | "light" | "dark";
  aiConnections: AIConnection[];
  activeAIConnectionId: string | null;
  privacy: {
    allowTranscriptStorage: boolean;
  };
  updatedAt: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: 1,
  displayName: "Faraz",
  timezone: "Asia/Tehran",
  defaultStudyTime: "20:00",
  weekStartsOn: "saturday",
  theme: "system",
  aiConnections: [
    {
      id: "local-ollama",
      name: "Local Ollama",
      provider: "ollama",
      model: "gemma3",
      baseUrl: "http://localhost:11434",
      credentialMode: "session",
      enabled: true,
      updatedAt: "2026-07-31T00:00:00.000Z",
    },
  ],
  activeAIConnectionId: "local-ollama",
  privacy: { allowTranscriptStorage: true },
  updatedAt: "2026-07-31T00:00:00.000Z",
};

export function cloneDefaultSettings(): AppSettings {
  return JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS)) as AppSettings;
}

function limitedString(value: unknown, fallback: string, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

/** Rebuild settings from an allowlist so credentials and unknown fields cannot persist. */
export function sanitizeAppSettings(value: unknown): AppSettings | null {
  if (!value || typeof value !== "object" || (value as { schemaVersion?: unknown }).schemaVersion !== 1) return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.aiConnections)) return null;
  const aiConnections = candidate.aiConnections.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const connection = item as Record<string, unknown>;
    if (!AI_PROVIDERS.includes(connection.provider as AIProvider) || !CREDENTIAL_MODES.includes(connection.credentialMode as CredentialMode)) return [];
    const id = limitedString(connection.id, "", 100);
    if (!id) return [];
    return [{
      id,
      name: limitedString(connection.name, "Unnamed connection", 120),
      provider: connection.provider as AIProvider,
      model: limitedString(connection.model, "", 200),
      baseUrl: limitedString(connection.baseUrl, "", 2048),
      credentialMode: connection.credentialMode as CredentialMode,
      enabled: connection.enabled !== false,
      updatedAt: limitedString(connection.updatedAt, new Date().toISOString(), 40),
    } satisfies AIConnection];
  });
  const activeCandidate = typeof candidate.activeAIConnectionId === "string" ? candidate.activeAIConnectionId : null;
  const activeAIConnectionId = aiConnections.some((item) => item.id === activeCandidate) ? activeCandidate : aiConnections[0]?.id || null;
  const privacy = candidate.privacy && typeof candidate.privacy === "object" ? candidate.privacy as Record<string, unknown> : {};
  const weekStartsOn = ["saturday", "sunday", "monday"].includes(String(candidate.weekStartsOn)) ? candidate.weekStartsOn as AppSettings["weekStartsOn"] : DEFAULT_APP_SETTINGS.weekStartsOn;
  const theme = ["system", "light", "dark"].includes(String(candidate.theme)) ? candidate.theme as AppSettings["theme"] : DEFAULT_APP_SETTINGS.theme;
  const defaultStudyTime = limitedString(candidate.defaultStudyTime, DEFAULT_APP_SETTINGS.defaultStudyTime, 5);
  return {
    schemaVersion: 1,
    displayName: limitedString(candidate.displayName, DEFAULT_APP_SETTINGS.displayName, 120),
    timezone: limitedString(candidate.timezone, DEFAULT_APP_SETTINGS.timezone, 100),
    defaultStudyTime: /^\d{2}:\d{2}$/.test(defaultStudyTime) ? defaultStudyTime : DEFAULT_APP_SETTINGS.defaultStudyTime,
    weekStartsOn,
    theme,
    aiConnections,
    activeAIConnectionId,
    privacy: { allowTranscriptStorage: privacy.allowTranscriptStorage !== false },
    updatedAt: new Date().toISOString(),
  };
}
