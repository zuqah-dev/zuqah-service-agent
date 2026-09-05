/**
 * Route table.
 *
 * Every route is registered here; route files themselves may live anywhere under
 * /app. The convention is to suffix them `.route.tsx` and encode the URL in the
 * filename, so a path can be found by searching for it.
 *
 * Auth routes sit outside the app shell layout deliberately — a signed-out user
 * must be able to reach /login without the shell trying to render a user menu
 * for someone who is not there.
 */
import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // --- unauthenticated ---------------------------------------------------
  route("/login", "auth/routes/auth.login.route.tsx"),
  route("/logout", "auth/routes/auth.logout.route.tsx"),
  route("/api/auth-callback", "auth/routes/auth.callback.route.tsx"),

  // Outside the shell: App Service probes this every few seconds and it must
  // never depend on session handling.
  route("/healthcheck", "layout/routes/healthcheck.route.tsx"),

  // --- the application shell ---------------------------------------------
  layout("layout/root.layout.tsx", [
    index("layout/routes/home.route.tsx"),
    route("/chat", "chat/routes/chat.route.tsx"),
    route("/api/chat", "chat/routes/api.chat.ts"),
    route("/documents/:file", "chat/routes/documents.route.tsx"),
  ]),
] satisfies RouteConfig;
