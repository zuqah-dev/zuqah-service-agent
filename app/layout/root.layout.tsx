/**
 * Application shell.
 *
 * Everything behind this layout requires a signed-in user — the guard runs once
 * here rather than being repeated in each child route, so a new page cannot be
 * added and accidentally left unprotected.
 */
import { Link, Outlet, useLoaderData, useLocation, type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/auth/auth.server";
import { isDemoAuth } from "~/common/envVars.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);

  // Only what the shell renders. The refresh token stays on the server.
  return { user: { name: user.name, email: user.email }, demoAuth: isDemoAuth() };
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/chat", label: "Chat" },
];

export default function RootLayout() {
  const { user, demoAuth } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Visible on every page. Someone walking past a screen should be able to
          tell that this is a demonstration with sign-in switched off. */}
      {demoAuth ? (
        <div className="bg-amber-500 px-6 py-1.5 text-center text-xs font-medium text-amber-950">
          Demo environment — Microsoft sign-in disabled, all content is fabricated
        </div>
      ) : null}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
          <span className="text-sm font-semibold text-slate-900">Zuqah Technologies Service Agent</span>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    active
                      ? "rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900"
                      : "rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-medium text-white"
              title={user.email}
            >
              {initials}
            </span>
            <a href="/logout" className="text-sm text-slate-500 hover:text-slate-900">
              Sign out
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Outlet />
      </main>

      {/* Stated on every page, not just in the deck. Nothing here is real. */}
      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-400">
        Demonstration environment · Zuqah Technologies · all content is sample data
      </footer>
    </div>
  );
}
