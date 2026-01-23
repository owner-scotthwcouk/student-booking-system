// supabase/functions/notify-booking/index.ts

import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";
import { sendEmail } from "../_shared/resend.ts";

type NotifyBookingRequest = {
  booking_id: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const payload = await verifySupabaseJwt(req.headers.get("Authorization"));
    const userId = (payload.sub as string) || "";
    if (!userId) return json(401, { error: "Unauthorized" });

    const { booking_id } = (await req.json()) as NotifyBookingRequest;
    if (!booking_id) return json(400, { error: "booking_id is required" });

    const supabase = supabaseAdmin();

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, lesson_date, lesson_time, student_id, tutor_id, status")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return json(404, { error: "Booking not found" });
    }

    // Only student or tutor can trigger
    if (booking.student_id !== userId && booking.tutor_id !== userId) {
      return json(403, { error: "Forbidden" });
    }

    const { data: tutor, error: tutorErr } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.tutor_id)
      .single();

    if (tutorErr || !tutor?.email) {
      return json(404, { error: "Tutor email not found" });
    }

    const { data: student } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", booking.student_id)
      .single();

    const subject = "New lesson booking";
    const html = `
      <div>
        <h2>New Booking</h2>
        <p><strong>Student:</strong> ${student?.full_name || "Unknown"} (${student?.email || "N/A"})</p>
        <p><strong>Date:</strong> ${booking.lesson_date}</p>
        <p><strong>Time:</strong> ${booking.lesson_time}</p>
        <p><strong>Status:</strong> ${booking.status}</p>
      </div>
    `;

    await sendEmail({ to: tutor.email, subject, html });

    return json(200, { ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
