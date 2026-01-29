import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { amount, bookingId, studentId, currency = 'GBP' } = req.body || {}

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount in pence/cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: bookingId || '',
        studentId: studentId || ''
      }
    })

    return res.status(200).json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id })
  } catch (err) {
    console.error('create-intent error', err)
    return res.status(500).json({ error: 'internal', message: String(err.message || err) })
  }
}
