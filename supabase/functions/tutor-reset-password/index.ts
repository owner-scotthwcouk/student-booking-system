import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";

type TutorResetPasswordRequest = {
  student_id: string;
};

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

function generateTemporaryPassword(length = 14) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
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
    const tutorId = (payload.sub as string) || "";
    if (!tutorId) return json(401, { error: "Unauthorized" });

    const { student_id } = (await req.json()) as TutorResetPasswordRequest;
    if (!student_id) {
      return json(400, { error: "student_id is required" });
    }

    const supabase = supabaseAdmin();

    const { data: tutorProfile, error: tutorProfileError } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", tutorId)
      .single();

    if (tutorProfileError || !tutorProfile) {
      return json(403, { error: "Tutor profile not found" });
    }

    if (tutorProfile.role !== "tutor") {
      return json(403, { error: "Only tutors can reset student passwords" });
    }

    const { data: studentProfile, error: studentProfileError } = await supabase
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", student_id)
      .single();

    if (studentProfileError || !studentProfile) {
      return json(404, { error: "Student not found" });
    }

    if (studentProfile.role !== "student") {
      return json(400, { error: "Selected user is not a student" });
    }

    if (!studentProfile.email) {
      return json(400, { error: "Student does not have an email address" });
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: studentAuth, error: studentAuthError } =
      await supabase.auth.admin.getUserById(student_id);
    if (studentAuthError || !studentAuth?.user) {
      return json(404, { error: "Student auth account not found" });
    }

    const nextAppMetadata = {
      ...(studentAuth.user.app_metadata ?? {}),
      force_password_reset: true,
      password_reset_reason: "temporary_password",
      password_reset_issued_at: new Date().toISOString(),
    };

    const { error: updateUserError } = await supabase.auth.admin.updateUserById(
      student_id,
      {
        password: temporaryPassword,
        app_metadata: nextAppMetadata,
      },
    );

    if (updateUserError) {
      return json(500, { error: updateUserError.message || "Failed to update student password" });
    }

    const tutorName = tutorProfile.full_name || tutorProfile.email || "Tutor";
    const logPayload = {
      student_id,
      tutor_id: tutorId,
      tutor_name: tutorName,
      tutor_email: tutorProfile.email || "",
      student_email: studentProfile.email,
      status: "requested" as const,
    };

    const { data: logRow, error: logInsertError } = await supabase
      .from("student_password_reset_requests")
      .insert(logPayload)
      .select("id")
      .single();

    if (logInsertError || !logRow?.id) {
      return json(500, { error: logInsertError?.message || "Failed to record reset request" });
    }

    await supabase
      .from("student_password_reset_requests")
      .update({
        status: "sent",
        error_message: null,
      })
      .eq("id", logRow.id);

    return json(200, {
      ok: true,
      student_id,
      email: studentProfile.email,
      request_id: logRow.id,
      temporary_password: temporaryPassword,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
