export const config = { runtime: 'edge' };

const PAYPAL_BASE =
  (process.env.PAYPAL_ENV || 'live').toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { amount, currency_code = 'GBP', intent = 'CAPTURE', reference_id, description } =
    (await req.json().catch(() => ({}))) || {};

  if (!amount) {
    return new Response(JSON.stringify({ error: 'amount is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { fetchPayPalToken } = await import('../_client.js'); // note the .js extension
  const accessToken = await fetchPayPalToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent,
      purchase_units: [
        {
          amount: { currency_code, value: amount },
          reference_id,
          description,
        },
      ],
      application_context: {
        brand_name: process.env.APP_NAME || 'Student Booking',
        user_action: 'PAY_NOW',
      },
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
}
