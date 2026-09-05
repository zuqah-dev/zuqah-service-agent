/**
 * Entra ID OAuth2 — authorization code flow.
 *
 * Written directly against the Microsoft identity platform endpoints rather than
 * through a library, because the flow is three HTTP calls and a redirect, and
 * being able to read it end to end is worth more here than the abstraction.
 *
 * WHO IS ALLOWED IN is not decided here. The Enterprise Application is set to
 * "assignment required" and governed by a security group, so Entra refuses
 * unassigned users before they ever reach this code. The application maintains
 * no access list of its own — see docs/decisions/0004-entra-group-access.md.
 */
import { getEnv } from "~/common/envVars.server";
import type { SessionUser } from "./authSession.server";

/**
 * openid/profile/email identify the user. offline_access is what makes a refresh
 * token come back, which is what lets a session outlive the one-hour access
 * token without bouncing the user through a sign-in.
 */
const SCOPES = ["openid", "profile", "email", "offline_access", "User.Read"];

/**
 * Entra configuration, asserted present.
 *
 * The three values are optional in the environment schema because demo mode does
 * not need them. Everything in this module does, so it is asserted once here
 * rather than checked at each use — and reaching this code without them means a
 * demo-mode deployment somehow routed into the Entra path, which should fail
 * loudly rather than send a request with `client_id=undefined`.
 */
function entraConfig(): { clientId: string; clientSecret: string; tenantId: string } {
  const env = getEnv();

  if (!env.AUTH_CLIENT_ID || !env.AUTH_CLIENT_SECRET || !env.AUTH_TENANT_ID) {
    throw new Error(
      `Entra sign-in was invoked but is not configured (AUTH_MODE=${env.AUTH_MODE}). ` +
        "Set AUTH_CLIENT_ID, AUTH_CLIENT_SECRET and AUTH_TENANT_ID, or use AUTH_MODE=demo."
    );
  }

  return {
    clientId: env.AUTH_CLIENT_ID,
    clientSecret: env.AUTH_CLIENT_SECRET,
    tenantId: env.AUTH_TENANT_ID,
  };
}

function authority(): string {
  return `https://login.microsoftonline.com/${entraConfig().tenantId}`;
}

export function redirectUri(request: Request): string {
  return new URL("/api/auth-callback", new URL(request.url).origin).toString();
}

/** Where to send the browser to begin sign-in. */
export function buildAuthorizeUrl(request: Request, state: string): string {
  const { clientId } = entraConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(request),
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
  });
  return `${authority()}/oauth2/v2.0/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
};

async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(`${authority()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    // The provider's error body is genuinely useful for diagnosis (it names
    // redirect URI mismatches and consent problems explicitly), so it is logged
    // — but never returned to the browser.
    const detail = await response.text();
    console.error("[auth] token request failed", response.status, detail);
    throw new Error(`Token request failed: ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}

/** Exchange the authorization code from the callback for tokens. */
export async function exchangeCode(request: Request, code: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = entraConfig();
  return requestToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(request),
      scope: SCOPES.join(" "),
    })
  );
}

/** Trade a refresh token for a fresh access token, without user interaction. */
export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = entraConfig();
  return requestToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: SCOPES.join(" "),
    })
  );
}

type GraphMe = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

/**
 * Read the signed-in user's profile from Microsoft Graph.
 *
 * Graph rather than the id_token claims because `mail` is reliably present here
 * and is what we key the user on. Guest accounts in particular carry a mangled
 * userPrincipalName, so preferring `mail` matters.
 */
export async function fetchProfile(accessToken: string): Promise<SessionUser> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Graph /me failed: ${response.status}`);
  }

  const me = (await response.json()) as GraphMe;
  const email = me.mail ?? me.userPrincipalName;

  if (!email) {
    throw new Error("Signed-in account has no email address");
  }

  return {
    id: me.id,
    email,
    name: me.displayName ?? email,
    expiresAt: "",
    refreshToken: "",
  };
}
