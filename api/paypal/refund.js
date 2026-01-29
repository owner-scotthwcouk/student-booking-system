// /api/paypal/refund.js
const PAYPAL_ENV = process.env.PAYPAL_ENV ?? 'live';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = PAYPAL_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`token_failed ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { captureId, amount, currency_code } = req.body || {};
    if (!captureId) return res.status(400).json({ error: 'captureId_required' });

    const { access_token } = await getAccessToken();

    const body = amount
      ? { amount: { value: amount, currency_code: currency_code || 'GBP' } }
      : undefined;

    const paypalRes = await fetch(`${PAYPAL_API}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `refund-${captureId}-${Date.now()}`, // idempotent
      },
      body: body ? JSON.stringify(body) : null,
    });

    const text = await paypalRes.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!paypalRes.ok) return res.status(paypalRes.status).json({ ok: false, data });

    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
}
