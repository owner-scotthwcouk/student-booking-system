// supabase/functions/_shared/jwt.ts

import { ENV } from "./env.ts";

/**
 * Verifies a Supabase user JWT and returns the payload.
 * The JWT secret must be the GoTrue JWT secret (GOTRUE_JWT_SECRET),
 * provided as JWT_SECRET in supabase/functions/.env.
 */
export async function verifySupabaseJwt(authHeader: string | null) {
  if (!authHeader) throw new Error("Missing Authorization header");
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) throw new Error("Invalid Authorization header");

  const res = await fetch(`${ENV.supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ENV.supabaseServiceRoleKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth user lookup failed (${res.status}): ${text}`);
  }

  const user = await res.json();
  const userId = user?.id as string | undefined;
  if (!userId) {
    throw new Error("Auth user lookup returned no user id");
  }

  return { sub: userId, user };
}
