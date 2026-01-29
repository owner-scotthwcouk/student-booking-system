// Deprecated: PayPal endpoints removed — use Stripe endpoints instead.
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  return res.status(410).json({ error: 'paypal_disabled', message: 'PayPal support removed. Use Stripe endpoints.' })
}