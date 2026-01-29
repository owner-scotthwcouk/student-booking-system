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

    const { orderId } = body || {};
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { fetchPayPalToken } = await import('../_client.js');
    const accessToken = await fetchPayPalToken();

    const paypalRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await paypalRes.json().catch(() => ({}));

    return new Response(JSON.stringify(data), {
      status: paypalRes.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'CAPTURE_ORDER_FUNCTION_FAILED',
        message: String(err?.message || err),
        stack: err?.stack,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
