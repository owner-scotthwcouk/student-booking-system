// /api/paypal/webhook.js (Vercel Serverless Function, Node 18+)
status: "paid",
payment_provider: "paypal",
payment_id: capture_id,
paid_at: new Date().toISOString(),
amount,
currency,
};
const r = await fetch(url, {
method: "PATCH",
headers: {
apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
"Content-Type": "application/json",
Prefer: "return=representation",
},
body: JSON.stringify(body),
});
if (!r.ok) {
const t = await r.text();
throw new Error(`supabase_update_failed:${r.status}:${t}`);
}
return r.json();
}


module.exports = async (req, res) => {
if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method Not Allowed" }); }
const raw = await readRawBody(req);
let evt; try { evt = JSON.parse(raw); } catch { return res.status(400).json({ error: "invalid json" }); }


const missing = ["PAYPAL_CLIENT_ID","PAYPAL_CLIENT_SECRET","PAYPAL_WEBHOOK_ID","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"].filter(k=>!process.env[k]);
if (missing.length) return res.status(500).json({ error: `missing env: ${missing.join(',')}` });


// 1) Token + signature verify
let token; try { token = await getLiveToken(); } catch (e) { return res.status(500).json({ error: String(e) }); }
const ok = await verifySignature(token, req.headers, evt);
if (!ok) return res.status(400).json({ error: "verification_failed" });


// 2) Handle events
try {
switch (evt.event_type) {
case "PAYMENT.CAPTURE.COMPLETED": {
const capture = evt.resource; // has id, amount, etc.
const pu = capture.supplementary_data?.related_ids?.order_id ? null : evt?.resource?.purchase_units?.[0];
// Preferred: pass your booking UUID as purchase_units[0].reference_id when creating the order
const reference_id = pu?.reference_id || evt?.resource?.supplementary_data?.related_ids?.order_id;
await markBookingPaid({
reference_id,
capture_id: capture.id,
amount: capture.amount?.value,
currency: capture.amount?.currency_code,
});
break;
}
case "PAYMENT.CAPTURE.DENIED":
case "CHECKOUT.PAYMENT-APPROVAL.REVERSED":
// TODO: update bookings.status accordingly (e.g., 'failed' or 'reversed')
break;
default:
// no-op for now
break;
}
} catch (e) {
return res.status(500).json({ error: String(e) });
}


return res.status(200).json({ ok: true });
};