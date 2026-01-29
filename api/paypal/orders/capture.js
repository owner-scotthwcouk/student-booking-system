// api/paypal/orders/capture.js
import { fetchPayPalToken, getPayPalBase } from '../_client.js';

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { orderId } = body;

    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const accessToken = await fetchPayPalToken();
    const base = getPayPalBase();

    const ppRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': (process.env.APP_NAME || 'student-booking-system') + ' / orders-capture',
      },
    });

    const raw = await ppRes.text();
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch {}

    if (ppRes.ok && parsed) {
      return res.status(ppRes.status).json(parsed);
    }

    const diagHeaders = {};
    for (const h of ['paypal-debug-id', 'www-authenticate', 'content-type', 'server']) {
      const v = ppRes.headers.get(h);
      if (v) diagHeaders[h] = v;
    }

    return res.status(ppRes.status).json({
      error: 'PAYPAL_CAPTURE_FAILED',
      status: ppRes.status,
      ok: ppRes.ok,
      headers: diagHeaders,
      body: parsed ?? raw,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'CAPTURE_ORDER_FUNCTION_FAILED',
      message: String(err?.message || err),
    });
  }
}
