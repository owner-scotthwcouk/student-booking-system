import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).send('Method Not Allowed')
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET env')
    return res.status(500).json({ error: 'webhook_secret_missing' })
  }

  let event
  try {
    // raw body is required for signature verification; in many hosts you must
    // configure the platform to not parse the body. Here we assume `req.body` is raw.
    const buf = await getRawBody(req)
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object
      const paymentIntentId = intent.id
      const amount = (intent.amount_received || intent.amount) / 100
      const currency = (intent.currency || 'gbp').toUpperCase()
      const metadata = intent.metadata || {}
      const bookingId = metadata.bookingId || null
      const studentId = metadata.studentId || null

      // Insert into Supabase using service role
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase server envs')
        return res.status(500).json({ error: 'supabase_config_missing' })
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // upsert payment record
      const { error: insertError } = await supabase.from('payments').insert({
        booking_id: bookingId,
        student_id: studentId,
        amount: amount,
        currency: currency,
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
        payment_date: new Date().toISOString()
      })

      if (insertError) console.error('Failed to insert payment', insertError)

      if (bookingId) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ payment_status: 'paid', status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', bookingId)
        if (updateError) console.error('Failed to update booking', updateError)
      }
    }

    // Return success for all handled events
    return res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error', err)
    return res.status(500).json({ error: 'handler_error', message: String(err.message || err) })
  }
}

// Helper to read raw request body
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
