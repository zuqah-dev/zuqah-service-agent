/**
 * Environment configuration, validated once at startup.
 *
 * Everything the application needs is listed here, so a misconfigured deployment
 * fails immediately with a readable message rather than at the first request that
 * happens to touch the missing value.
 *
 * Values marked optional belong to phases that are not built yet. They are
 * declared now so the deployment can supply them without a code change, and so
 * this file doubles as the definitive list of what App Service must set.
 */
import { z } from "zod";

const EnvSchema = z.object({
  // --- runtime -----------------------------------------------------------
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PUBLIC_APP_ENV: z.string().default("local"),
  PORT: z.coerce.number().default(3000),

  // --- auth --------------------------------------------------------------
  //
  // Two modes. `entra` is the real thing and the production path. `demo` skips
  // Microsoft sign-in entirely and gates on a shared access code instead, so the
  // application can be shown before an Entra app registration exists.
  //
  // The Entra credentials are optional ONLY in demo mode; the refinement below
  // makes them required in entra mode, so a half-configured deployment fails at
  // startup with a readable message rather than at the sign-in redirect.
  AUTH_MODE: z.enum(["entra", "demo"]).default("entra"),
  AUTH_CLIENT_ID: z.string().optional(),
  AUTH_CLIENT_SECRET: z.string().optional(),
  AUTH_TENANT_ID: z.string().optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),

  // Shared code for demo mode. Required when AUTH_MODE=demo — without it the
  // application would be open to anyone who finds the URL, which on a public
  // App Service means anyone at all.
  DEMO_ACCESS_CODE: z.string().optional(),
  DEMO_USER_NAME: z.string().default("Alex Morgan"),
  DEMO_USER_EMAIL: z.string().default("alex.morgan@zuqah.com"),

  // --- database (Phase 5 — not yet used in Phases 1–4) ------------------
  DATABASE_URL: z.string().optional(),

  // --- Azure AI Foundry --------------------------------------------------
  // One account serves the model, the agent runtime, Content Safety and
  // Document Intelligence. See docs/decisions/0008-single-foundry-account.md.
  AZURE_FOUNDRY_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_FOUNDRY_PROJECT_ENDPOINT: z.string().url().optional(),
  AZURE_COGNITIVE_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_AGENT_MODEL: z.string().optional(),
  AZURE_OPENAI_EMBEDDING_MODEL: z.string().optional(),

  // --- Azure AI Search (Phase 2) -----------------------------------------
  AZURE_SEARCH_ENDPOINT: z.string().url().optional(),
  AZURE_SEARCH_API_KEY: z.string().optional(),
  AZURE_SEARCH_INDEX: z.string().default("zuqah-policies"),

  // --- Storage (Phase 2 and 4) -------------------------------------------
  AZURE_STORAGE_ACCOUNT: z.string().optional(),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),

  // --- Azure DevOps (Phase 5) --------------------------------------------
  AZURE_DEVOPS_ORG_URL: z.string().optional(),
  AZURE_DEVOPS_PROJECT: z.string().optional(),
  AZURE_DEVOPS_PAT: z.string().optional(),

  // --- telemetry ---------------------------------------------------------
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
});

/**
 * Mode-dependent requirements.
 *
 * Expressed as a refinement rather than two separate schemas so there is one
 * definition of the environment, and so the error message names the mode that
 * made a field required.
 */
const EnvSchemaChecked = EnvSchema.superRefine((env, ctx) => {
  if (env.AUTH_MODE === "entra") {
    for (const key of ["AUTH_CLIENT_ID", "AUTH_CLIENT_SECRET", "AUTH_TENANT_ID"] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when AUTH_MODE=entra`,
        });
      }
    }
  }

  if (env.AUTH_MODE === "demo") {
    if (!env.DEMO_ACCESS_CODE || env.DEMO_ACCESS_CODE.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DEMO_ACCESS_CODE"],
        message: "DEMO_ACCESS_CODE of at least 6 characters is required when AUTH_MODE=demo",
      });
    }
  }
});

export type EnvVars = z.infer<typeof EnvSchema>;

let cached: EnvVars | undefined;

/**
 * Validated environment. Throws on first call if anything required is missing,
 * listing every problem at once rather than one per restart.
 */
export function getEnv(): EnvVars {
  if (cached) return cached;

  const parsed = EnvSchemaChecked.safeParse(process.env);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  cached = parsed.data;

  // Deliberately loud, and on every start. A running instance with sign-in
  // switched off should never be a surprise to whoever is looking at the logs.
  if (cached.AUTH_MODE === "demo") {
    console.warn(
      "\n" +
        "  ****************************************************************\n" +
        "  *  DEMO MODE — Microsoft sign-in is DISABLED                    *\n" +
        "  *  Access is gated by a shared code only.                       *\n" +
        "  *  Set AUTH_MODE=entra before this is used for anything real.   *\n" +
        "  ****************************************************************\n"
    );
  }

  return cached;
}

/** True when Microsoft sign-in is bypassed. Drives the banner in the UI. */
export function isDemoAuth(): boolean {
  return getEnv().AUTH_MODE === "demo";
}

/**
 * True once the knowledge base is wired up. Lets routes degrade honestly in the
 * phases before Azure AI Search exists rather than failing obscurely.
 */
export function isSearchConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.AZURE_SEARCH_ENDPOINT && env.AZURE_SEARCH_API_KEY);
}

/** True once the Foundry account is reachable. */
export function isFoundryConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.AZURE_FOUNDRY_API_KEY && env.AZURE_FOUNDRY_PROJECT_ENDPOINT);
}
