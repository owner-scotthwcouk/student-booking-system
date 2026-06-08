import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import gocardless from "npm:gocardless-nodejs";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const client = gocardless(
  Deno.env.get("GC_ACCESS_TOKEN")!,
  Deno.env.get("GC_ENVIRONMENT")!, // 'sandbox' or 'live'
);

serve(async (req) => {
  try {
    const body = await req.json();
    const event = body.events[0];

    // Handle "fulfilled" event (Payment success)
    if (
      event.action === "fulfilled" &&
      event.resource_type === "billing_requests"
    ) {
      const billingRequestId = event.links.billing_request;

      // 1. Fetch the billing request to get the metadata (which contains your booking_id)
      const billingRequest =
        await client.billingRequests.find(billingRequestId);
      const bookingId = billingRequest.metadata?.booking_id;

      if (bookingId) {
        // 2. Update your booking status in Supabase
        const { error } = await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            payment_status: "paid",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        if (error) {
          console.error("Supabase update error:", error);
          return new Response("Supabase Error", { status: 500 });
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
