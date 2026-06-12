import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";
import { sendEmail } from "../_shared/email.ts";

type SystemMailRequest = {
  recipient_id?: string;
  recipient_email?: string;
  subject?: string;
  body?: string;
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
    const senderId = (payload.sub as string) || "";
    if (!senderId) return json(401, { error: "Unauthorized" });

    const { recipient_id, recipient_email, subject, body } = (await req.json()) as SystemMailRequest;

    if (!subject?.trim()) return json(400, { error: "subject is required" });
    if (!body?.trim()) return json(400, { error: "body is required" });
    if (!recipient_id && !recipient_email) {
      return json(400, { error: "recipient_id or recipient_email is required" });
    }

    const supabase = supabaseAdmin();

    const { data: senderProfile, error: senderProfileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", senderId)
      .single();

    if (senderProfileError || !senderProfile) {
      return json(404, { error: "Sender profile not found" });
    }

    let recipientProfile = null;
    if (recipient_id) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", recipient_id)
        .single();

      if (error || !data) {
        return json(404, { error: "Recipient not found" });
      }
      recipientProfile = data;
    } else if (recipient_email) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("email", recipient_email)
        .single();

      if (error || !data) {
        return json(404, { error: "Recipient not found" });
      }
      recipientProfile = data;
    }

    const insertPayload = {
      sender_id: senderProfile.id,
      recipient_id: recipientProfile.id,
      sender_email: senderProfile.email || "",
      recipient_email: recipientProfile.email || "",
      subject: subject.trim(),
      body: body.trim(),
    };

    const { data: mailRow, error: insertError } = await supabase
      .from("system_mail")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !mailRow?.id) {
      return json(500, { error: insertError?.message || "Failed to store message" });
    }

    let externalSent = false;
    let externalError: string | null = null;
    try {
      if (recipientProfile.email) {
        await sendEmail({
          to: recipientProfile.email,
          subject: subject.trim(),
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
              <h2 style="margin: 0 0 16px;">${subject.trim()}</h2>
              <p style="white-space: pre-wrap;">${body.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="color: #64748b; font-size: 0.92rem;">Sent from ${senderProfile.full_name || senderProfile.email || "Edumaxim"} via the Edumaxim message center.</p>
            </div>
          `,
        });
        externalSent = true;
      }
    } catch (mailError) {
      externalError = mailError instanceof Error ? mailError.message : "Failed to send external email";
    }

    await supabase
      .from("system_mail")
      .update({
        external_sent: externalSent,
        external_error: externalError,
      })
      .eq("id", mailRow.id);

    return json(200, {
      ok: true,
      id: mailRow.id,
      external_sent: externalSent,
      external_error: externalError,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
