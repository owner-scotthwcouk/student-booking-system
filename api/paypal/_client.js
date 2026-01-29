// api/paypal/_client.js
export async function fetchPayPalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    return {
      ok: false,
      status: 500,
      json: { error: 'missing_env', message: 'PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set' }
    };
  }

  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const resp = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return { ok: resp.ok, status: resp.status, json: data };
}