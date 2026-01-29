export const runtime = 'nodejs';

const base =
  (process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export async function getAccessToken(): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    throw new Error("PayPal Client ID or Secret is missing in Environment Variables.");
  }

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
    throw new Error(`PayPal Token Error (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Creates a PayPal order.
 * @param value - The string amount (e.g. "30.00")
 * @param currency_code - e.g. "GBP"
 * @param reference_id - The Booking ID (UUID)
 */
export async function createOrder(value: string, currency_code = 'GBP', reference_id?: string) {
  const { access_token } = await getAccessToken();

  const payload: any = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code, value }
    }],
    application_context: { shipping_preference: 'NO_SHIPPING' },
  };

  // Important: Pass the booking ID so we know what this payment is for later
  if (reference_id) {
    payload.purchase_units[0].reference_id = reference_id;
  }

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal Create Order Error (${res.status}): ${JSON.stringify(data)}`);
  }
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
  if (!res.ok) {
    throw new Error(`PayPal Capture Error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}