// /api/paypal/webhook.js  (Vercel Serverless Function, Node 18+)

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const raw = await readRawBody(req);
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return res.status(400).json({ error: "invalid json" });
  }

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID; // fill after you register it in PayPal
  if (!id || !secret || !webhookId) {
    return res.status(500).json({ error: "missing PayPal env vars" });
  }

  // 1) Get access token (LIVE)
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const tokResp = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tok = await tokResp.json();
  if (!tokResp.ok) return res.status(500).json({ error: "token_failed", details: tok });

  // 2) Verify signature with PayPal
  const h = req.headers; // node lowercases header names
  const verifyResp = await fetch(
    "https://api-m.paypal.com/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: h["paypal-auth-algo"],
        cert_url: h["paypal-cert-url"],
        transmission_id: h["paypal-transmission-id"],
        transmission_sig: h["paypal-transmission-sig"],
        transmission_time: h["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: event,
      }),
    }
  );
  const verify = await verifyResp.json();
  if (verify.verification_status !== "SUCCESS") {
    return res.status(400).json({ error: "verification_failed", verify });
  }

  // 3) Handle events
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED":
      // TODO: look up your booking via reference_id or event.resource.id
      // TODO: mark paid in Supabase (do it server-side here)
      break;
    case "PAYMENT.CAPTURE.DENIED":
    case "CHECKOUT.PAYMENT-APPROVAL.REVERSED":
      // TODO: mark failed/reversed
      break;
    default:
      // no-op
      break;
  }

  return res.status(200).json({ ok: true });
};
