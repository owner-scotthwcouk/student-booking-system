import { BASE, getAccessToken } from './_client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderID } = req.body || {};
    if (!orderID) return res.status(400).json({ error: 'missing_orderID' });

    const accessToken = await getAccessToken();
    const r = await fetch(`${BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await r.json().catch(async () => ({ raw: await r.text() }));
    if (!r.ok) {
      console.error('PayPal capture error', data);
      return res.status(500).json({ error: 'paypal_capture_failed', details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('order-capture failed', err);
    return res.status(500).json({ error: 'internal', message: String(err?.message || err) });
  }
}
