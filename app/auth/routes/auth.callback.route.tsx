/**
 * Entra redirects here with an authorization code.
 *
 * This URL must be registered on the app registration under Authentication → Web.
 * The Bicep deployment prints it as `authRedirectUri`.
 */
import { redirect, type LoaderFunctionArgs } from "react-router";
import { getAuthSessionStorage } from "~/auth/authSession.server";
import { exchangeCode, fetchProfile } from "~/auth/entra.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const session = await getAuthSessionStorage().getSession(request.headers.get("cookie"));

  // Entra reports refusals here too — an unassigned user, or declined consent.
  const providerError = url.searchParams.get("error");
  if (providerError) {
    console.warn("[auth] provider returned error", providerError, url.searchParams.get("error_description"));
    session.flash("error", "Sign-in was not completed. You may not have access to this application.");
    return redirect("/login", {
      headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = session.get("returnTo") ? String(session.get("returnTo")) : "/";

  if (!code) {
    session.flash("error", "Sign-in did not return an authorization code.");
    return redirect("/login", {
      headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
    });
  }

  try {
    const tokens = await exchangeCode(request, code);
    const profile = await fetchProfile(tokens.access_token);

    session.set("user", {
      ...profile,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      refreshToken: tokens.refresh_token ?? "",
    });
    session.unset("returnTo");

    // `state` carries the intended destination. Only same-origin paths are
    // honoured, so a crafted state cannot turn this into an open redirect.
    const destination = state && state.startsWith("/") && !state.startsWith("//") ? state : expectedState;

    return redirect(destination, {
      headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
    });
  } catch (error) {
    console.error("[auth] callback failed", error);
    session.flash("error", "Sign-in failed. Please try again.");
    return redirect("/login", {
      headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
    });
  }
}
