import { BASE, getAccessToken } from './_client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { value = '1.00', currency_code = 'GBP' } = req.body || {};
    const accessToken = await getAccessToken();

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        { amount: { currency_code, value } }
      ],
      application_context: { shipping_preference: 'NO_SHIPPING' }
    };

    const r = await fetch(`${BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(async () => ({ raw: await r.text() }));
    if (!r.ok) {
      console.error('PayPal create error', data);
      return res.status(500).json({ error: 'paypal_create_failed', details: data });
    }

    return res.status(200).json({ id: data.id });
  } catch (err) {
    console.error('order-create failed', err);
    return res.status(500).json({ error: 'internal', message: String(err?.message || err) });
  }
}
