/**
 * Liveness probe, polled by App Service.
 *
 * Deliberately shallow: it reports that the process is up and serving, and
 * nothing more. A health check that also pings the database and Azure OpenAI
 * would take the site out of rotation whenever a dependency blinked — which,
 * during a demo, would turn a recoverable hiccup into a restart loop.
 *
 * Dependency status is reported but never affects the status code. Look at the
 * body to see what is wired up; look at the code to see whether the app is alive.
 */
import { getEnv, isFoundryConfigured, isSearchConfigured } from "~/common/envVars.server";

export async function loader() {
  let env: ReturnType<typeof getEnv> | undefined;
  let configValid = true;
  let configError: string | undefined;

  try {
    env = getEnv();
  } catch (error) {
    configValid = false;
    configError = error instanceof Error ? error.message : String(error);
  }

  return Response.json(
    {
      status: "ok",
      service: "zuqah-service-agent",
      environment: env?.PUBLIC_APP_ENV ?? "unknown",
      time: new Date().toISOString(),
      dependencies: {
        configuration: configValid ? "valid" : "invalid",
        search: configValid && isSearchConfigured() ? "configured" : "not configured",
        foundry: configValid && isFoundryConfigured() ? "configured" : "not configured",
      },
      ...(configError ? { configError } : {}),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
