/**
 * Session cookie.
 *
 * The whole session lives in the cookie, signed with SESSION_SECRET. There is no
 * server-side session store, which means any App Service instance can serve any
 * request without shared state — the right trade for a demo, and adequate here
 * because the session holds an identity and a refresh token, not application data.
 *
 * httpOnly and sameSite=lax together mean the cookie is unreadable from
 * JavaScript and is not sent on cross-site POSTs.
 */
import { createCookieSessionStorage } from "react-router";
import { getEnv } from "~/common/envVars.server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  /** Expiry of the current access token, ISO 8601. Drives silent refresh. */
  expiresAt: string;
  refreshToken: string;
};

type SessionData = {
  user: SessionUser;
  /** Where to send the user after sign-in completes. */
  returnTo: string;
};

type SessionFlash = {
  error: string;
};

/**
 * Built on first use, not at module load.
 *
 * This matters more than it looks. `getEnv()` throws when configuration is
 * incomplete, and this module is reachable from the route table — so calling it
 * at the top level took the whole server down before it could listen, including
 * `/healthcheck`, whose entire job is to keep answering when configuration is
 * broken. On App Service that turns one unresolved Key Vault reference into a
 * container restart loop with no diagnosable output.
 *
 * Deferring the call means the process starts, the health check answers and
 * reports what is wrong, and only routes that genuinely need a session fail.
 */
let storage: ReturnType<typeof createCookieSessionStorage<SessionData, SessionFlash>> | undefined;

export function getAuthSessionStorage() {
  if (storage) return storage;

  const env = getEnv();

  storage = createCookieSessionStorage<SessionData, SessionFlash>({
    cookie: {
      name: "_session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [env.SESSION_SECRET],
      // App Service terminates TLS and the site is httpsOnly, so this is always
      // true in a deployed environment. Local development over http would break
      // if it were unconditional.
      secure: env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
    },
  });

  return storage;
}

export const getSession = (cookie: string | null) => getAuthSessionStorage().getSession(cookie);
export const commitSession: ReturnType<typeof getAuthSessionStorage>["commitSession"] = (...args) =>
  getAuthSessionStorage().commitSession(...args);
export const destroySession: ReturnType<typeof getAuthSessionStorage>["destroySession"] = (...args) =>
  getAuthSessionStorage().destroySession(...args);
