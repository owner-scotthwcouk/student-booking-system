// supabase/functions/paypal-create-order/index.ts

import { ENV, PAYPAL_BASE_URL } from "../_shared/env.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";

type CreateOrderRequest = {
  booking_id: string;
};

async function paypalAccessToken(): Promise<string> {
  const auth = btoa(`${ENV.paypal.clientId}:${ENV.paypal.clientSecret}`);
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal token error (${res.status}): ${txt}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

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
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    if (!ENV.paypal.clientId || !ENV.paypal.clientSecret) {
      return json(500, { error: "Missing PayPal credentials in Edge Function secrets" });
    }

    // Require an authenticated Supabase user
    const payload = await verifySupabaseJwt(req.headers.get("Authorization"));
    const userId = (payload.sub as string) || "";
    if (!userId) return json(401, { error: "Unauthorized" });

    const { booking_id } = (await req.json()) as CreateOrderRequest;
    if (!booking_id) return json(400, { error: "booking_id is required" });

    const supabase = supabaseAdmin();

    // Load booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, student_id, tutor_id, status, payment_status, duration_minutes")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return json(404, { error: "Booking not found" });
    }

    // Basic authorization: student or tutor can pay (adjust if you want student-only)
    if (booking.student_id !== userId && booking.tutor_id !== userId) {
      return json(403, { error: "Forbidden" });
    }

    // Basic status check
    if (booking.status && !["pending", "confirmed"].includes(booking.status)) {
      return json(400, { error: `Booking status not payable: ${booking.status}` });
    }

    if (booking.payment_status === "paid") {
      return json(400, { error: "Booking is already paid" });
    }

    const token = await paypalAccessToken();

    const currency = "GBP";
    const hourlyRateRaw = Deno.env.get("LESSON_HOURLY_RATE") ?? "50";
    const hourlyRateParsed = Number(hourlyRateRaw);
    const hourlyRate = Number.isFinite(hourlyRateParsed) ? hourlyRateParsed : 50;
    const durationMinutes = booking.duration_minutes ?? 60;
    const amount = Number((durationMinutes / 60) * hourlyRate).toFixed(2);
    if (Number(amount) <= 0) {
      return json(400, { error: "Calculated amount must be greater than 0" });
    }

    const createOrderRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: booking.id,
            amount: { currency_code: currency, value: amount },
          },
        ],
      }),
    });

    if (!createOrderRes.ok) {
      const txt = await createOrderRes.text();
      throw new Error(`PayPal create order error (${createOrderRes.status}): ${txt}`);
    }

    const order = await createOrderRes.json();

    // Persist a payment row (optional but recommended)
    // Adjust columns to match your schema.
    const { error: paymentInsertError } = await supabase.from("payments").insert({
      booking_id: booking.id,
      student_id: booking.student_id,
      amount: amount,
      currency: currency,
      payment_method: "paypal",
      paypal_order_id: order.id,
      status: "pending",
    });

    if (paymentInsertError) {
      return json(500, { error: `Failed to create payment record: ${paymentInsertError.message}` });
    }

    return json(200, { orderId: order.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
