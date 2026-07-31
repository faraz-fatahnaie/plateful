export type AccountProvider = "openai-workspace" | "google-via-cloudflare" | "development";

export type AccountSnapshot = {
  authenticated: boolean;
  user?: {
    email: string;
    name: string;
    provider: AccountProvider;
  };
  sync?: {
    playlistCount: number;
    videoCount: number;
    noteCount: number;
    lastSyncedAt: string | null;
  };
  signOutUrl?: string | null;
  loginUrl?: string | null;
};
