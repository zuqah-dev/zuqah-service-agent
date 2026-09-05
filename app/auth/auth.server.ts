/**
 * Guards used by loaders and actions.
 *
 *   requireAuth(request)  throws a redirect to /login if nobody is signed in
 *   tryAuth(request)      returns the user or null, never throws
 *
 * Access tokens last about an hour. Rather than let a session die mid-use, a GET
 * request with under fifteen minutes remaining silently refreshes and redirects
 * to itself. Only GETs, because replaying a POST after a redirect would resubmit
 * whatever the user just did.
 */
import { redirect } from "react-router";
import { getEnv } from "~/common/envVars.server";
import { getAuthSessionStorage, type SessionUser } from "./authSession.server";
import { refreshTokens } from "./entra.server";

const REFRESH_WHEN_UNDER_MINUTES = 15;

/**
 * The identity used in demo mode.
 *
 * A single fixed person. There is no token, so the refresh path below is skipped
 * entirely — `refreshToken` is empty and `expiresAt` is far enough out never to
 * trigger it.
 *
 * This does NOT weaken the identity boundary. Tools still resolve the caller from
 * the session server-side and still expose no identity parameter to the model —
 * see ADR-0006. What changes is only how the session came to exist.
 */
export function demoUser(): SessionUser {
  const env = getEnv();
  return {
    id: "demo-user",
    email: env.DEMO_USER_EMAIL,
    name: env.DEMO_USER_NAME,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    refreshToken: "",
  };
}

function minutesUntil(iso: string): number {
  const expiry = new Date(iso).getTime();
  if (Number.isNaN(expiry)) return -1;
  return (expiry - Date.now()) / 60000;
}

/** Read the session user without any redirecting. */
export async function tryAuth(request: Request): Promise<SessionUser | null> {
  const session = await getAuthSessionStorage().getSession(request.headers.get("cookie"));
  return session.get("user") ?? null;
}

/**
 * Require a signed-in user.
 *
 * @throws a redirect to /login when there is no session, or to the same URL
 *         after a silent token refresh.
 */
export async function requireAuth(request: Request): Promise<SessionUser> {
  const session = await getAuthSessionStorage().getSession(request.headers.get("cookie"));
  const user = session.get("user");

  if (!user) {
    // Remember where they were headed so sign-in returns them there rather than
    // dumping everyone on the home page.
    const path = new URL(request.url).pathname;
    if (path !== "/login") session.set("returnTo", path);

    throw redirect("/login", {
      headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
    });
  }

  const remaining = minutesUntil(user.expiresAt);

  if (request.method === "GET" && user.refreshToken && remaining < REFRESH_WHEN_UNDER_MINUTES) {
    try {
      const tokens = await refreshTokens(user.refreshToken);
      session.set("user", {
        ...user,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        refreshToken: tokens.refresh_token ?? user.refreshToken,
      });

      throw redirect(request.url, {
        headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
      });
    } catch (error) {
      // A redirect is how success is signalled, so it must not be swallowed by
      // the catch that handles a genuinely failed refresh.
      if (error instanceof Response) throw error;

      console.warn("[auth] token refresh failed, signing out", error);
      session.unset("user");

      throw redirect("/login", {
        headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
      });
    }
  }

  return user;
}
