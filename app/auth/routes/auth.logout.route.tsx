/**
 * Sign out.
 *
 * Clears the local session only; the Microsoft session is left alone
 * deliberately. During a demo, signing out of Entra entirely would also sign the
 * presenter out of the Azure portal in the next tab.
 */
import { redirect, type LoaderFunctionArgs } from "react-router";
import { getAuthSessionStorage } from "~/auth/authSession.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAuthSessionStorage().getSession(request.headers.get("cookie"));

  return redirect("/login", {
    headers: { "Set-Cookie": await getAuthSessionStorage().destroySession(session) },
  });
}
