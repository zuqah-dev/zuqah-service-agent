/**
 * Document shell — the HTML around every route.
 */
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Zuqah Technologies Service Agent</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

/**
 * Last-resort error page.
 *
 * The first version showed "Error 500 — the details have been logged" for every
 * failure, which was wrong twice over. A client-side render error is not a route
 * error response, so it fell through to a hard-coded 500 and reported a server
 * fault that had not happened; and nothing was actually logged, so there were no
 * details anywhere to find.
 *
 * It now distinguishes the two cases and, in a non-production environment, shows
 * the message. A demonstration environment that hides its own errors costs more
 * time than it saves.
 */
export function ErrorBoundary() {
  const error = useRouteError();

  const isResponse = isRouteErrorResponse(error);
  const status = isResponse ? error.status : null;

  const title = isResponse
    ? status === 404
      ? "Page not found"
      : `Request failed (${status})`
    : "The page failed to load";

  const detail = isResponse
    ? error.statusText || String(error.data ?? "")
    : error instanceof Error
      ? error.message
      : String(error ?? "Unknown error");

  const stack = !isResponse && error instanceof Error ? error.stack : undefined;

  // Logged on both sides: server-rendered failures reach the container log,
  // client-side ones reach the browser console. Previously neither happened.
  if (typeof console !== "undefined") {
    console.error("[ErrorBoundary]", { status, detail, error });
  }

  const showDetail = import.meta.env.DEV || import.meta.env.VITE_SHOW_ERRORS !== "false";

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {isResponse ? `HTTP ${status}` : "Client error"}
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">{title}</h1>

        {showDetail && detail ? (
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-xs text-slate-700">
            {detail}
            {stack ? `\n\n${stack}` : ""}
          </pre>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Try again, or return to the home page.</p>
        )}

        <a
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Go home
        </a>
      </div>
    </main>
  );
}
