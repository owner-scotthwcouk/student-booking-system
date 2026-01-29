import { NextResponse } from 'next/server';
import { createOrder } from '../_paypal';
import { createClient } from '@supabase/supabase-js';

// Force dynamic to prevent static generation errors
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    console.log("--- Starting Create Order Request ---");

    // 1. Validate Environment Variables Manually
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!sbUrl || !sbKey) {
      console.error("CRITICAL: Missing Supabase Environment Variables");
      return NextResponse.json({ 
        error: "Server Configuration Error: Missing Supabase URL or Service Key" 
      }, { status: 500 });
    }

    // 2. Initialize Supabase (Service Role for Admin Access)
    // We do this here to avoid global scope crashes
    const supabase = createClient(sbUrl, sbKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Parse Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse JSON body");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { reference_id } = body;
    console.log(`Received Booking ID: ${reference_id}`);

    if (!reference_id) {
      return NextResponse.json({ error: 'Missing reference_id (Booking ID)' }, { status: 400 });
    }

    // 4. Fetch Booking Details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('tutor_id, duration_minutes')
      .eq('id', reference_id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking Lookup Error:", bookingError);
      return NextResponse.json({ error: 'Booking not found in database' }, { status: 404 });
    }

    console.log(`Found Booking. Tutor ID: ${booking.tutor_id}, Duration: ${booking.duration_minutes}`);

    // 5. Fetch Tutor Hourly Rate
    // Default to £30.00 if nothing is found
    let hourlyRate = 30.00;

    if (booking.tutor_id) {
      const { data: tutorProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('hourly_rate')
        .eq('id', booking.tutor_id)
        .single();
      
      if (!profileError && tutorProfile?.hourly_rate) {
        hourlyRate = Number(tutorProfile.hourly_rate);
        console.log(`Found custom hourly rate: £${hourlyRate}`);
      } else {
        console.log("Using default hourly rate: £30.00 (Profile not found or no rate set)");
      }
    }

    // 6. Calculate Price
    const duration = booking.duration_minutes || 60;
    const priceValue = ((duration / 60) * hourlyRate).toFixed(2);
    
    console.log(`Final Calculated Price: £${priceValue}`);

    // 7. Create PayPal Order
    try {
      const order = await createOrder(priceValue, 'GBP', reference_id);
      console.log("PayPal Order Created Successfully:", order.id);
      return NextResponse.json(order);
    } catch (paypalError: any) {
      console.error("PayPal API Failed:", paypalError.message);
      return NextResponse.json({ error: "PayPal Creation Failed: " + paypalError.message }, { status: 500 });
    }

  } catch (err: any) {
    // 8. Catch-all for any other crashes
    console.error("Unhandled Server Error:", err.message);
    return NextResponse.json(
      { error: "Internal Server Error: " + err.message }, 
      { status: 500 }
    );
  }
}