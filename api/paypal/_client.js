const BASE = process.env.PAYPAL_BASE || 'https://api-m.paypal.com'; // sandbox: https://api-m.sandbox.paypal.com
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET env vars');
}

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`token ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.access_token;
}

export { BASE, getAccessToken };
