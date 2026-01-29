// app/api/paypal/order-create/route.ts
import { NextResponse } from 'next/server';
import { createOrder } from '../_paypal';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Get the Booking ID (reference_id) sent by PayNow.jsx
    const { reference_id } = await req.json();

    if (!reference_id) {
      return NextResponse.json({ error: 'Missing booking ID (reference_id)' }, { status: 400 });
    }

    // 2. Fetch the Booking to find out who the Tutor is
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('tutor_id, duration_minutes')
      .eq('id', reference_id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking lookup failed:", bookingError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 3. Fetch the Tutor's Hourly Rate
    // Default to £30.00 if they haven't set one
    let hourlyRate = 30.00;

    const { data: tutorProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('hourly_rate')
      .eq('id', booking.tutor_id)
      .single();

    if (!profileError && tutorProfile?.hourly_rate) {
      hourlyRate = Number(tutorProfile.hourly_rate);
    }

    // 4. Calculate Final Price
    // Formula: (Duration in Minutes / 60) * Hourly Rate
    const duration = booking.duration_minutes || 60;
    const price = ((duration / 60) * hourlyRate).toFixed(2);

    // 5. Create PayPal Order
    // We pass 'reference_id' so the capture step knows which booking this is for
    const order = await createOrder(price, 'GBP', reference_id);
    
    return NextResponse.json(order);
  } catch (err: any) {
    console.error('Create route error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}