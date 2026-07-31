export type AIProvider = "chatgpt" | "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "lmstudio" | "compatible";
export type CredentialMode = "none" | "session" | "server";

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
