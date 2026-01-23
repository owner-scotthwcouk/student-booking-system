// supabase/functions/paypal-webhook/index.ts

import { ENV } from "../_shared/env.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

/**
 * Minimal webhook receiver.
 * In production you should verify PayPal webhook signatures using PAYPAL_WEBHOOK_ID
 * and PayPal's verify endpoint. For local dev, you can accept the payload and reconcile.
 */
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const event = await req.json();

    const supabase = supabaseAdmin();

    // Store webhook raw (optional table; adjust if you have one)
    // If you do not have a table, you can remove this.
    // await supabase.from("payment_webhooks").insert({
    //   provider: "paypal",
    //   event_type: event.event_type,
    //   payload: event,
    // });

    // Example reconciliation: mark payment captured when PayPal says so
    const eventType = event?.event_type as string | undefined;

    if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event?.resource;
      const orderId =
        resource?.supplementary_data?.related_ids?.order_id ||
        resource?.id ||
        "";

      if (orderId) {
        const nextStatus =
          eventType === "PAYMENT.CAPTURE.COMPLETED" ? "completed" : "pending";
        await supabase
          .from("payments")
          .update({ status: nextStatus })
          .eq("payment_method", "paypal")
          .eq("paypal_order_id", orderId);
      }
    }

    return json(200, { ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json(500, { error: message });
  }
});
