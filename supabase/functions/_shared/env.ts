export const ENV = {
  get supabaseUrl() {
    const value = Deno.env.get("SUPABASE_URL");
    if (!value || !value.trim()) {
      throw new Error("Missing required env var: SUPABASE_URL");
    }
    return value.trim();
  },
  get supabaseServiceRoleKey() {
    const value = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!value || !value.trim()) {
      throw new Error("Missing required env var: SUPABASE_SERVICE_ROLE_KEY");
    }
    return value.trim();
  },
};
