// supabase/functions/_shared/env.ts

export type PayPalEnv = "sandbox" | "live";

function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v || !v.trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

function requiredAny(names: string[]): string {
  for (const name of names) {
    const v = Deno.env.get(name);
    if (v && v.trim()) return v.trim();
  }
  throw new Error(`Missing required env var: ${names.join(" or ")}`);
}

function optional(name: string): string {
  const v = Deno.env.get(name);
  return v ? v.trim() : "";
}

export const ENV = {
  // Supabase Edge runtime should inject these automatically.
  // Use SB_ fallbacks for local .env (SUPABASE_* vars are skipped by CLI)
  supabaseUrl: requiredAny(["SUPABASE_URL", "SB_URL"]),
  // Service role key is required for server-side DB updates.
  // In local dev this is typically injected; if not, you can add a non-SUPABASE name and map it.
  supabaseServiceRoleKey: requiredAny(["SUPABASE_SERVICE_ROLE_KEY", "SB_SERVICE_ROLE_KEY"]),

  // JWT secret (optional since we now validate via /auth/v1/user)
  jwtSecret: optional("JWT_SECRET"),

  paypal: {
    env: (Deno.env.get("PAYPAL_ENV")?.trim() || "sandbox") as PayPalEnv,
    clientId: optional("PAYPAL_CLIENT_ID"),
    clientSecret: optional("PAYPAL_CLIENT_SECRET"),
    webhookId: optional("PAYPAL_WEBHOOK_ID"),
  },
};

export const PAYPAL_BASE_URL =
  ENV.paypal.env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
