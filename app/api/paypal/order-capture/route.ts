import { NextResponse } from 'next/server';
import { captureOrder } from '../_paypal';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin (Service Role) to ensure we can update bookings/payments
// regardless of RLS policies for the public user.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Extract orderID correctly
    // PayNow.jsx sends it in the URL query string: /api/paypal/order-capture?orderId=...
    const { searchParams } = new URL(req.url);
    const orderID = searchParams.get('orderId');

    if (!orderID) {
      return NextResponse.json({ error: 'Missing orderID' }, { status: 400 });
    }

    // 2. Capture the order with PayPal
    const result = await captureOrder(String(orderID));

    // 3. Verify the capture was successful
    if (result.status === 'COMPLETED') {
      // retrieve the booking ID we stored in "reference_id" during order creation
      const bookingId = result.purchase_units?.[0]?.reference_id;
      
      if (bookingId) {
        // A. Mark Booking as Confirmed & Paid
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ 
            status: 'confirmed', 
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId);

        if (bookingError) {
          console.error('Failed to update booking status:', bookingError);
        }

        // B. Fetch Booking details to create a Payment record
        const { data: booking } = await supabase
          .from('bookings')
          .select('student_id, tutor_id, duration_minutes') // adjust fields as needed
          .eq('id', bookingId)
          .single();

        // C. Insert Record into Payments Table
        if (booking) {
          // Extract the actual amount captured from PayPal response
          const capturedAmount = result.purchase_units[0].payments.captures[0].amount.value;
          const currency = result.purchase_units[0].payments.captures[0].amount.currency_code;
          const transactionId = result.purchase_units[0].payments.captures[0].id;

          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              booking_id: bookingId,
              student_id: booking.student_id,
              amount: capturedAmount,
              currency: currency,
              payment_method: 'paypal',
              paypal_transaction_id: transactionId,
              paypal_order_id: orderID,
              status: 'completed',
              payment_date: new Date().toISOString()
            });
            
          if (paymentError) {
            console.error('Failed to log payment:', paymentError);
          }
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Capture route error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}