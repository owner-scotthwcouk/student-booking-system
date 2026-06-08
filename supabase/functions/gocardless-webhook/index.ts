import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import gocardless from "npm:gocardless-nodejs";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const client = gocardless(
  Deno.env.get("GC_ACCESS_TOKEN")!,
  Deno.env.get("GC_ENVIRONMENT")!
);

serve(async (req) => {
  // 1. Get the signature from the headers
  const signature = req.headers.get("Webhook-Signature");
  const webhookSecret = Deno.env.get("GC_WEBHOOK_SECRET")!;
  
  // 2. Read the raw body text
  const body = await req.text();

  try {
    // 3. Verify the signature using the GoCardless SDK
    const events = client.webhooks.parse(body, signature, webhookSecret);

    // 4. Process each event
    for (const event of events) {
      if (event.action === "fulfilled" && event.resource_type === "billing_requests") {
        const billingRequest = await client.billingRequests.find(event.links.billing_request);
        const bookingId = billingRequest.metadata?.booking_id;

        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed', payment_status: 'paid' })
            .eq('id', bookingId);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Invalid Signature", { status: 401 });
  }
});