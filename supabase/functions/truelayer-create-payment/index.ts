import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { amount, bookingId } = await req.json();

  const tokenRes = await fetch("https://auth.truelayer.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: Deno.env.get("TRUELAYER_CLIENT_ID")!,
      client_secret: Deno.env.get("TRUELAYER_CLIENT_SECRET")!,
      scope: "payments",
    }),
  });
  
  const { access_token } = await tokenRes.json();

  const paymentRes = await fetch("https://api.truelayer.com/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      amount_in_minor: Math.round(amount * 100),
      currency: "GBP",
      payment_method: { type: "bank_transfer" },
      user_parameters: { 
        return_uri: `${Deno.env.get("FRONTEND_URL")}/student/dashboard?status=success` 
      }
    }),
  });

  const paymentData = await paymentRes.json();
  
  return new Response(JSON.stringify(paymentData), {
    headers: { "Content-Type": "application/json" },
  });
});