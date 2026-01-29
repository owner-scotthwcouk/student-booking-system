export const config = { runtime: 'edge' };

const PAYPAL_BASE =
  (process.env.PAYPAL_ENV || 'live').toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

export default async function handler(request) {
  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', detail: String(e) }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const {
      amount,
      currency_code = 'GBP',
      intent = 'CAPTURE',
      reference_id,
      description,
    } = body || {};

    if (!amount) {
      return new Response(JSON.stringify({ error: 'amount is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Lazy import to avoid path issues; keep the .js extension
    const { fetchPayPalToken } = await import('../_client.js');
    const accessToken = await fetchPayPalToken();

    const paypalRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
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

    const data = await paypalRes.json().catch(() => ({}));

    // Surface PayPal errors back to you instead of crashing
    return new Response(JSON.stringify(data), {
      status: paypalRes.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    // Final safety net — return the stack so you can see the cause in your client
    return new Response(
      JSON.stringify({
        error: 'CREATE_ORDER_FUNCTION_FAILED',
        message: String(err?.message || err),
        stack: err?.stack,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
