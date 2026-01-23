import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE_URL")!;
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

async function getAccessToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { order_id } = await req.json();

  const token = await getAccessToken();

  const captureRes = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const capture = await captureRes.json();

  return new Response(JSON.stringify(capture), {
    headers: { "Content-Type": "application/json" },
  });
});
