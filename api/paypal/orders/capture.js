// api/paypal/orders/capture.js
import { fetchPayPalToken, getPayPalBase } from '../_client.js';

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
}

// Deprecated: PayPal endpoints removed — use Stripe endpoints instead.
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  return res.status(410).json({ error: 'paypal_disabled', message: 'PayPal support removed. Use Stripe endpoints.' })
}
