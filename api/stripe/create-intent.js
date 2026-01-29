import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
  apiVersion: '2024-11-20.acacia' 
})

export default async function handler(req, res) {
  // Enable CORS for Vercel
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, studentId, tutorId, bookingId, studentEmail, currency = 'gbp' } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    if (!studentId || !tutorId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert pounds to pence
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId: bookingId || '',
        studentId: studentId || '',
        tutorId: tutorId || ''
      },
      receipt_email: studentEmail || null,
      description: `Tutoring session payment - Booking ${bookingId || 'N/A'}`
    })

    return res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id 
    })
  } catch (err) {
    console.error('Stripe create-intent error:', err)
    return res.status(500).json({ 
      error: 'Payment intent creation failed', 
      message: err.message 
    })
  }
}
