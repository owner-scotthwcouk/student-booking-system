import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";
import { sendEmail } from "../_shared/email.ts";

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

    const frontendUrl = Deno.env.get("FRONTEND_URL");
    if (!frontendUrl) {
      return json(500, { error: "FRONTEND_URL is not configured" });
    }

    const redirectTo = `${frontendUrl.replace(/\/$/, "")}/reset-password`;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: studentProfile.email,
      options: { redirectTo },
    });

    if (linkError) {
      return json(500, { error: linkError.message || "Failed to generate reset link" });
    }

    const actionLink = linkData?.properties?.action_link || linkData?.action_link;
    if (!actionLink) {
      return json(500, { error: "Reset link was not generated" });
    }

    const tutorName = tutorProfile.full_name || tutorProfile.email || "Tutor";
    const studentName = studentProfile.full_name || "student";
    const subject = "Password reset requested by your tutor";
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

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 16px;">Password reset request</h2>
        <p>Hello ${studentName},</p>
        <p>${tutorName} has requested a password reset for your student account.</p>
        <p>
          <a href="${actionLink}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;">
            Reset your password
          </a>
        </p>
        <p>If you did not expect this email, you can ignore it.</p>
      </div>
    `;

    try {
      await sendEmail({
        to: studentProfile.email,
        subject,
        html,
      });

      await supabase
        .from("student_password_reset_requests")
        .update({
          status: "sent",
          error_message: null,
        })
        .eq("id", logRow.id);
    } catch (emailError) {
      const message = emailError instanceof Error ? emailError.message : "Failed to send reset email";
      await supabase
        .from("student_password_reset_requests")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", logRow.id);
      return json(500, { error: message });
    }

    return json(200, {
      ok: true,
      student_id,
      email: studentProfile.email,
      request_id: logRow.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
