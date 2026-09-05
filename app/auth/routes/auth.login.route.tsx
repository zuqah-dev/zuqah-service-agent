/**
 * Sign-in, in both modes.
 *
 * ENTRA MODE — the loader redirects straight to Microsoft. There is no local
 * form because there are no local credentials. It renders only when something
 * went wrong, so the user is not bounced in a loop.
 *
 * DEMO MODE — Microsoft sign-in is bypassed and a shared access code is asked for
 * instead. The code exists because the application runs on a public App Service
 * URL: without it, anyone who found the address could use it, which mostly means
 * spending someone else's model quota. It is a gate, not an identity — everyone
 * who enters it becomes the same demo user, and the page says so.
 */
import { redirect, useActionData, useLoaderData, useNavigation, Form, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { demoUser } from "~/auth/auth.server";
import { getAuthSessionStorage } from "~/auth/authSession.server";
import { buildAuthorizeUrl } from "~/auth/entra.server";
import { getEnv } from "~/common/envVars.server";

interface LoginView {
  mode: "entra" | "demo";
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const env = getEnv();
  const session = await getAuthSessionStorage().getSession(request.headers.get("cookie"));

  if (session.get("user")) {
    return redirect("/");
  }

  const error = session.get("error");

  if (env.AUTH_MODE === "demo") {
    return Response.json(
      { mode: "demo", error: error ?? null } satisfies LoginView,
      { headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) } }
    );
  }

  // Show the failure rather than immediately retrying, which would spin.
  if (error) {
    return Response.json(
      { mode: "entra", error: error ?? null } satisfies LoginView,
      { headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) } }
    );
  }

  const returnTo = session.get("returnTo") ?? "/";
  return redirect(buildAuthorizeUrl(request, returnTo), {
    headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
  });
}

/**
 * Read the submitted code, whatever shape the body arrives in.
 *
 * `request.formData()` THROWS when the content type is not a form encoding, and
 * an unhandled throw inside an action becomes React Router's opaque "Unexpected
 * Server Error" — which is exactly what a user hit here, with no way for either
 * of us to see the cause from the browser.
 *
 * An action that fails on a content type is fragile for no benefit, so the body
 * is read defensively: form encoding first, then JSON, then raw text. Anything
 * unreadable yields an empty string, which fails the comparison below and shows
 * the normal "that code is not correct" message rather than an error page.
 */
async function readCode(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("form")) {
      const form = await request.formData();
      return String(form.get("code") ?? "").trim();
    }

    const text = await request.text();
    if (!text) return "";

    if (contentType.includes("json")) {
      const parsed = JSON.parse(text) as { code?: unknown };
      return typeof parsed.code === "string" ? parsed.code.trim() : "";
    }

    // No usable content type — try both encodings before giving up.
    try {
      const parsed = JSON.parse(text) as { code?: unknown };
      return typeof parsed.code === "string" ? parsed.code.trim() : "";
    } catch {
      return new URLSearchParams(text).get("code")?.trim() ?? "";
    }
  } catch (error) {
    console.warn("[auth] could not read the submitted code", error);
    return "";
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const env = getEnv();
  const session = await getAuthSessionStorage().getSession(request.headers.get("cookie"));

  // Posting to this route is only meaningful in demo mode. In entra mode there
  // is nothing to post, and accepting one would be a way in.
  if (env.AUTH_MODE !== "demo") {
    return redirect("/login");
  }

  const submitted = await readCode(request);

  if (!submitted || submitted !== env.DEMO_ACCESS_CODE) {
    // Deliberately slow. A shared code is short, and an unthrottled form is a
    // few thousand guesses a minute.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Returned as ordinary data with a 200, NOT as a 401.
    //
    // React Router treats a non-2xx Response from an action as an error and
    // hands it to the ErrorBoundary — so the first version answered a mistyped
    // code with a full-page error instead of the form and a message. The status
    // code was technically correct and completely wrong for the user.
    return { error: "That code is not correct." };
  }

  session.set("user", demoUser());
  const returnTo = session.get("returnTo") ?? "/";
  session.unset("returnTo");

  return redirect(returnTo, {
    headers: { "Set-Cookie": await getAuthSessionStorage().commitSession(session) },
  });
}

export default function Login() {
  const data = useLoaderData() as LoginView;
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  // An action error is the fresh one; the loader's is a leftover from a redirect.
  const error = actionData?.error ?? data.error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Zuqah Technologies Service Agent</h1>

        {data.mode === "demo" ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Demonstration environment. Enter the access code to continue.
            </p>

            <Form method="post" className="mt-6 space-y-3">
              <label htmlFor="code" className="block text-sm font-medium text-slate-700">
                Access code
              </label>
              <input
                id="code"
                name="code"
                type="password"
                autoFocus
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
              />

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Checking…" : "Continue"}
              </button>
            </Form>

            {/* Said plainly, on the page itself. Nobody should be able to look at
                this and think they signed in with their Microsoft account. */}
            <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
              Microsoft sign-in is disabled in this environment. Everyone who enters
              the code is signed in as the same sample user, and all content is
              fabricated for demonstration purposes.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <p className="mt-4 text-xs text-slate-500">
              If you believe you should have access, ask to be added to the demo group.
            </p>
            <a
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Try again
            </a>
          </>
        )}
      </div>
    </main>
  );
}
