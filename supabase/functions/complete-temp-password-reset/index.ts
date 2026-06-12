import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const payload = await verifySupabaseJwt(req.headers.get("Authorization"));
    const studentId = (payload.sub as string) || "";
    if (!studentId) return json(401, { error: "Unauthorized" });

    const supabase = supabaseAdmin();

    const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(studentId);
    if (authError || !authResult?.user) {
      return json(404, { error: "Auth account not found" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", studentId)
      .single();

    if (profileError || !profile) {
      return json(404, { error: "Profile not found" });
    }

    if (profile.role !== "student") {
      return json(403, { error: "Only students can complete a temporary password reset" });
    }

    const nextAppMetadata = {
      ...(authResult.user.app_metadata ?? {}),
      force_password_reset: false,
      password_reset_reason: null,
      password_reset_issued_at: authResult.user.app_metadata?.password_reset_issued_at ?? null,
    };

    const { error: updateError } = await supabase.auth.admin.updateUserById(studentId, {
      app_metadata: nextAppMetadata,
    });

    if (updateError) {
      return json(500, { error: updateError.message || "Failed to clear temporary password flag" });
    }

    return json(200, { ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
