// api/paypal/_client.js
// ESM module. Make sure imports use file extensions when importing this file: `import {...} from './_client.js'`

const ENV = process.env.PAYPAL_ENV ?? 'live';
export const PAYPAL_API =
  ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

function assertEnv() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }
}

export async function getAccessToken() {
  assertEnv();
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`paypal_token_failed ${r.status} ${t}`);
  }
  return r.json();
}

export async function createPaypalOrder({ amount, currency_code = 'GBP', description, reference_id }) {
  const { access_token } = await getAccessToken();

  const body = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code,
          value: amount, // string like "25.00"
        },
        ...(description ? { description } : {}),
        ...(reference_id ? { reference_id } : {}),
      },
    ],
  };

  const r = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `order-${reference_id || Date.now()}`, // idempotency
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`paypal_create_failed ${r.status} ${text}`);
  return data;
}

export async function capturePaypalOrder(orderId) {
  const { access_token } = await getAccessToken();
  const r = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `capture-${orderId}-${Date.now()}`,
    },
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`paypal_capture_failed ${r.status} ${text}`);
  return data;
}
