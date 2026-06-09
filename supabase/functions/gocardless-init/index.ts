import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import gocardless from "npm:gocardless-nodejs";

const client = gocardless(
  Deno.env.get("GC_ACCESS_TOKEN")!,
  Deno.env.get("GC_ENVIRONMENT")!, // 'sandbox' or 'live'
);

serve(async (req) => {
  try {
    const { amount, bookingId } = await req.json();

    if (!amount || !bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing amount or bookingId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL");
    if (!frontendUrl) {
      return new Response(
        JSON.stringify({ error: "FRONTEND_URL is not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const billingRequest = await client.billingRequests.create({
      metadata: { booking_id: bookingId },
      payment_request: {
        amount: Math.round(Number(amount) * 100).toString(),
        currency: "GBP",
        scheme: "faster_payments",
      },
    });

    const flow = await client.billingRequestFlows.create({
      billing_request: billingRequest.id,
      redirect_uri: `${frontendUrl}/student/dashboard`,
      exit_uri: `${frontendUrl}/student/booking`,
    });

    return new Response(
      JSON.stringify({ checkout_url: flow.authorisation_url }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("gocardless-init failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to initialize GoCardless checkout",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
