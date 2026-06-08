import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import gocardless from "npm:gocardless-nodejs";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const client = gocardless(
  Deno.env.get("GC_ACCESS_TOKEN")!,
  Deno.env.get("GC_ENVIRONMENT")!, // 'sandbox' or 'live'
);

serve(async (req) => {
  const { amount, bookingId, email } = await req.json();

  // Create a billing request
  const billingRequest = await client.billingRequests.create({
    metadata: { booking_id: bookingId },
    payment_request: {
      amount: Math.round(amount * 100).toString(), // pence
      currency: "GBP",
      scheme: "faster_payments",
    },
  });

  // Create a flow for the user to visit
  const flow = await client.billingRequestFlows.create({
    billing_request: billingRequest.id,
    redirect_uri: `${Deno.env.get("FRONTEND_URL")}/student/dashboard`,
    exit_uri: `${Deno.env.get("FRONTEND_URL")}/student/booking`,
  });

  return new Response(
    JSON.stringify({ checkout_url: flow.authorisation_url }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
});
