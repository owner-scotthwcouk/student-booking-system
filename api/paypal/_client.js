// api/paypal/_client.js
let cachedToken = null;
let tokenExpiry = 0;

function getBase() {
  const env = (process.env.PAYPAL_ENV || 'live').toLowerCase();
  const domain = (process.env.PAYPAL_API_DOMAIN || 'api-m').toLowerCase(); // 'api-m' (default) or 'api'
  const host = domain === 'api' ? 'api.paypal.com' : 'api-m.paypal.com';
  return env === 'sandbox' ? `https://${host.replace('.paypal.com', '.sandbox.paypal.com')}` : `https://${host}`;
}

export async function fetchPayPalToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60_000) return cachedToken;

  const base = getBase();
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET');

  const creds = Buffer.from(`${id}:${secret}`).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'Accept-Language': 'en_GB',
      'User-Agent': (process.env.APP_NAME || 'student-booking-system') + ' / token',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`TOKEN_FAILED ${res.status}: ${text}`);
  }

  const json = JSON.parse(text);
  cachedToken = json.access_token;
  tokenExpiry = now + (json.expires_in ? json.expires_in * 1000 : 9 * 60 * 60 * 1000);
  return cachedToken;
}

export function getPayPalBase() {
  return getBase();
}
