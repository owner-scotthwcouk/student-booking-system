export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE } = process.env;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      console.error('PayPal env vars missing', {
        hasID: !!PAYPAL_CLIENT_ID,
        hasSecret: !!PAYPAL_SECRET,
      });
      res.status(500).json({ error: 'Server misconfigured' });
      return;
    }

    const base =
      PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');

    const upstream = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('PayPal token fetch failed', { status: upstream.status, data });
      res.status(502).json({ error: 'Upstream PayPal error', details: data });
      return;
    }

    res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      scope: data.scope,
      token_type: data.token_type,
    });
  } catch (err) {
    console.error('Unhandled in /api/paypal/token', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
