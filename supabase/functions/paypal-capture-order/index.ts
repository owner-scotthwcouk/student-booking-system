// supabase/functions/paypal-capture-order/index.ts

import { ENV, PAYPAL_BASE_URL } from "../_shared/env.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifySupabaseJwt } from "../_shared/jwt.ts";

type CaptureOrderRequest = {
  order_id: string;
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

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    // Require an authenticated Supabase user
    const payload = await verifySupabaseJwt(req.headers.get("Authorization"));
    const userId = (payload.sub as string) || "";
    if (!userId) return json(401, { error: "Unauthorized" });

    const { order_id } = (await req.json()) as CaptureOrderRequest;
    if (!order_id) return json(400, { error: "order_id is required" });

    const supabase = supabaseAdmin();

    // Find payment record
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("id, booking_id, status, paypal_order_id")
      .eq("payment_method", "paypal")
      .eq("paypal_order_id", order_id)
      .single();

    if (payErr || !payment) {
      return json(404, { error: "Payment record not found" });
    }

    const token = await paypalAccessToken();

    const captureRes = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(order_id)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    const captureBodyText = await captureRes.text();
    if (!captureRes.ok) {
      // Persist failure
    await supabase.from("payments").update({
      status: "failed",
    }).eq("id", payment.id);

      return json(400, { error: `PayPal capture failed: ${captureBodyText}` });
    }

    const capture = JSON.parse(captureBodyText);
    const captureId =
      capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
      capture?.id ||
      "";

    const { error: paymentUpdateError } = await supabase.from("payments").update({
      status: "completed",
      paypal_transaction_id: captureId,
      payment_date: new Date().toISOString(),
    }).eq("id", payment.id);

    if (paymentUpdateError) {
      return json(500, { error: `Failed to update payment: ${paymentUpdateError.message}` });
    }

    const { error: bookingPaidError } = await supabase.from("bookings").update({
      payment_status: "paid",
    }).eq("id", payment.booking_id);

    if (bookingPaidError) {
      return json(500, { error: `Failed to update booking payment status: ${bookingPaidError.message}` });
    }

    // If booking is still pending, confirm it (avoid overwriting completed/cancelled)
    await supabase.from("bookings").update({
      status: "confirmed",
    }).eq("id", payment.booking_id).eq("status", "pending");

    return json(200, { ok: true, captureId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
