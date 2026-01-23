import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  const event = await req.json();

  console.log("PayPal Webhook:", event.event_type);

  // You will later:
  // - verify webhook signature
  // - update payments table
  // - mark booking as paid

  return new Response("OK", { status: 200 });
});
