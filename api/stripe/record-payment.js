import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../_sendgrid.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { paymentIntentId, bookingId } = req.body || {}
    if (!paymentIntentId) return res.status(400).json({ error: 'missing_paymentIntentId' })

    // Verify the payment intent with Stripe
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (!intent) return res.status(404).json({ error: 'payment_intent_not_found' })

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ error: 'payment_not_succeeded', status: intent.status })
    }

    // Initialize Supabase Admin client using service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase server envs')
      return res.status(500).json({ error: 'supabase_config_missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // use metadata from the intent if provided
    const { bookingId: metaBooking, studentId: metaStudent } = intent.metadata || {}
    const finalBookingId = bookingId || metaBooking

    const amount = (intent.amount_received || intent.amount) / 100
    const currency = (intent.currency || 'gbp').toUpperCase()

    // Insert a payment record
    const { error: insertError } = await supabase.from('payments').insert({
      booking_id: finalBookingId || null,
      student_id: metaStudent || null,
      amount: amount,
      currency: currency,
      payment_method: 'stripe',
      stripe_payment_intent_id: intent.id,
      status: 'completed',
      payment_date: new Date().toISOString()
    })

    if (insertError) {
      console.error('Failed to insert payment record', insertError)
    }

    // Update booking to paid/confirmed if we have a booking id
    if (finalBookingId) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid', status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', finalBookingId)

      if (updateError) console.error('Failed to update booking', updateError)
    }

    // Best-effort: send a confirmation email to the student after successful payment.
    if (finalBookingId) {
      try {
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, lesson_date, lesson_time, student_id, tutor_id')
          .eq('id', finalBookingId)
          .single()

        if (booking?.student_id) {
          const [{ data: student }, { data: tutor }] = await Promise.all([
            supabase.from('profiles').select('full_name, email').eq('id', booking.student_id).single(),
            booking?.tutor_id
              ? supabase.from('profiles').select('full_name, email').eq('id', booking.tutor_id).single()
              : Promise.resolve({ data: null })
          ])

          if (student?.email) {
            const lessonDate = booking.lesson_date || 'TBC'
            const lessonTime = booking.lesson_time || 'TBC'
            const tutorName = tutor?.full_name || 'your tutor'
            const amountLabel = `${currency} ${amount.toFixed(2)}`

            await sendEmail({
              to: student.email,
              subject: 'Payment confirmed for your lesson',
              text: `Hi ${student.full_name || 'Student'}, your payment of ${amountLabel} was confirmed for ${lessonDate} at ${lessonTime} with ${tutorName}.`,
              html: `
                <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
                  <p>Hi ${student.full_name || 'Student'},</p>
                  <p>Your payment of <strong>${amountLabel}</strong> has been confirmed.</p>
                  <p>Lesson date: <strong>${lessonDate}</strong><br />Lesson time: <strong>${lessonTime}</strong><br />Tutor: <strong>${tutorName}</strong></p>
                  <p>Thank you.</p>
                </div>
              `,
              replyTo: tutor?.email || undefined
            })
          }
        }
      } catch (emailErr) {
        console.error('Failed to send payment confirmation email', emailErr)
      }
    }

    return res.status(200).json({ success: true, intent: intent })
  } catch (err) {
    console.error('record-payment error', err)
    return res.status(500).json({ error: 'internal', message: String(err.message || err) })
  }
}
