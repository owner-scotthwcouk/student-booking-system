export const config = { runtime: 'edge' };

const PAYPAL_BASE =
  (process.env.PAYPAL_ENV || 'live').toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

function cors(h = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    ...h,
  };
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors() });
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', detail: String(e) }),
        { status: 400, headers: cors({ 'content-type': 'application/json' }) }
      );
    }

    const { orderId } = body || {};
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: cors({ 'content-type': 'application/json' }),
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

    const raw = await paypalRes.text();
    let parsed;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (paypalRes.ok && parsed) {
      return new Response(JSON.stringify(parsed), {
        status: paypalRes.status,
        headers: cors({ 'content-type': 'application/json' }),
      });
    }

    const diagHeaders = {};
    for (const h of ['paypal-debug-id', 'www-authenticate', 'content-type']) {
      const v = paypalRes.headers.get(h);
      if (v) diagHeaders[h] = v;
    }

    return new Response(
      JSON.stringify({
        error: 'PAYPAL_CAPTURE_FAILED',
        status: paypalRes.status,
        ok: paypalRes.ok,
        headers: diagHeaders,
        body: parsed ?? raw,
      }),
      { status: paypalRes.status, headers: cors({ 'content-type': 'application/json' }) }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'CAPTURE_ORDER_FUNCTION_FAILED',
        message: String(err?.message || err),
        stack: err?.stack,
      }),
      { status: 500, headers: cors({ 'content-type': 'application/json' }) }
    );
  }
}
