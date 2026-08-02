import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AccountProvider } from "./account";

type AuthBindings = {
  AUTH_MODE?: "openai-workspace" | "cloudflare-access";
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  DEV_AUTH_EMAIL?: string;
};

export type AuthenticatedUser = {
  email: string;
  name: string | null;
  provider: AccountProvider;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function cleanEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() || "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function decodeForwardedName(request: Request) {
  const value = request.headers.get("oai-authenticated-user-full-name");
  if (!value) return null;
  if (request.headers.get("oai-authenticated-user-full-name-encoding") !== "percent-encoded-utf-8") return value;
  try { return decodeURIComponent(value); } catch { return null; }
}

async function authBindings(): Promise<AuthBindings> {
  try {
    const { env } = await import("cloudflare:workers");
    return env as unknown as AuthBindings;
  } catch {
    return {};
  }
}

function teamOrigin(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "https:") throw new Error("CF_ACCESS_TEAM_DOMAIN must use HTTPS");
  return url.origin;
}

async function cloudflareAccessUser(request: Request, bindings: AuthBindings): Promise<AuthenticatedUser | null> {
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion) return null;
  if (!bindings.CF_ACCESS_TEAM_DOMAIN || !bindings.CF_ACCESS_AUD) throw new Error("Cloudflare Access identity received without CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD verification settings");
  const issuer = teamOrigin(bindings.CF_ACCESS_TEAM_DOMAIN);
  let jwks = jwksCache.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    jwksCache.set(issuer, jwks);
  }
  const { payload } = await jwtVerify(assertion, jwks, { issuer, audience: bindings.CF_ACCESS_AUD });
  const email = cleanEmail(typeof payload.email === "string" ? payload.email : null);
  if (!email) throw new Error("Verified identity token does not contain a valid email address");
  return { email, name: typeof payload.name === "string" ? payload.name : null, provider: "google-via-cloudflare" };
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const bindings = await authBindings();
  if (bindings.AUTH_MODE === "cloudflare-access") return cloudflareAccessUser(request, bindings);

  const workspaceEmail = cleanEmail(request.headers.get("oai-authenticated-user-email"));
  if (bindings.AUTH_MODE === "openai-workspace") return workspaceEmail ? { email: workspaceEmail, name: decodeForwardedName(request), provider: "openai-workspace" } : null;

  const accessUser = await cloudflareAccessUser(request, bindings);
  if (accessUser) return accessUser;
  if (workspaceEmail) return { email: workspaceEmail, name: decodeForwardedName(request), provider: "openai-workspace" };

  const hostname = new URL(request.url).hostname;
  const developmentEmail = cleanEmail(bindings.DEV_AUTH_EMAIL);
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const email = developmentEmail || "local-preview@localhost.test";
    return { email, name: email.split("@")[0], provider: "development" };
  }
  return null;
}

/**
 * Protect routes that can reach third-party services or consume server secrets.
 * Localhost keeps an isolated preview identity so local AI/caption testing works
 * without weakening deployed routes.
 */
export async function getServiceUser(request: Request): Promise<AuthenticatedUser | null> {
  const user = await getAuthenticatedUser(request);
  if (user) return user;
  const hostname = new URL(request.url).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { email: "local-preview@localhost.test", name: "Local preview", provider: "development" };
  }
  return null;
}
