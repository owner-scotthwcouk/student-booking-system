// app/api/paypal/_paypal.ts
export const runtime = 'nodejs'; // force Node runtime (so Buffer is available)

const base =
  (process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

function assertEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function getAccessToken(): Promise<{ access_token: string; expires_in: number }> {
  const clientId = assertEnv('PAYPAL_CLIENT_ID');
  const secret = assertEnv('PAYPAL_CLIENT_SECRET');

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function createOrder(value: string, currency_code = 'GBP') {
  const { access_token } = await getAccessToken();

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code, value } }],
      application_context: { shipping_preference: 'NO_SHIPPING' },
    }),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal create order ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export async function captureOrder(orderID: string) {
  const { access_token } = await getAccessToken();

  const res = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}` },
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal capture ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
