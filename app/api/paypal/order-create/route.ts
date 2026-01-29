import { NextResponse } from 'next/server';
import { createOrder } from '../_paypal';
import { createClient } from '@supabase/supabase-js';

// Prevent Vercel from caching this route, which causes issues with POST bodies
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  console.log("--- Payment Initiation Started ---");

  try {
    // 1. Safe Environment Variable Access
    // We check these inside the function to avoid global scope crashes
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!sbUrl || !sbKey) {
      console.error("Server Error: Missing Supabase Env Vars");
      return NextResponse.json({ 
        error: "Server configuration error: Database credentials missing." 
      }, { status: 500 });
    }

    // 2. Initialize Supabase Admin Client
    const supabase = createClient(sbUrl, sbKey, {
      auth: { persistSession: false }
    });

    // 3. Parse and Validate Request Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body provided." }, { status: 400 });
    }

    const { reference_id } = body; // This corresponds to the bookingId

    if (!reference_id) {
      console.warn("Request missing reference_id");
      return NextResponse.json({ error: "Missing booking ID (reference_id)." }, { status: 400 });
    }

    // 4. Fetch Booking Details
    console.log(`Looking up booking: ${reference_id}`);
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('tutor_id, duration_minutes')
      .eq('id', reference_id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking lookup failed:", bookingError);
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // 5. Determine Hourly Rate
    // Default to 30.00 if the tutor hasn't set a rate or profile is missing
    let hourlyRate = 30.00;

    if (booking.tutor_id) {
      const { data: tutorProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('hourly_rate')
        .eq('id', booking.tutor_id)
        .single();
      
      if (!profileError && tutorProfile?.hourly_rate) {
        hourlyRate = Number(tutorProfile.hourly_rate);
      }
    }

    console.log(`Rate for Tutor ${booking.tutor_id}: £${hourlyRate}/hr`);

    // 6. Calculate Final Price
    const duration = booking.duration_minutes || 60;
    // Calculation: (Minutes / 60) * Rate
    const calculatedPrice = ((duration / 60) * hourlyRate).toFixed(2);

    console.log(`Creating PayPal order for £${calculatedPrice}`);

    // 7. Create Order via PayPal API
    const order = await createOrder(calculatedPrice, 'GBP', reference_id);

    return NextResponse.json(order);

  } catch (err: any) {
    console.error("CRITICAL API ERROR:", err.message);
    // Return a JSON error so the frontend doesn't get the "Unexpected token" HTML error
    return NextResponse.json(
      { error: `Payment initialization failed: ${err.message}` }, 
      { status: 500 }
    );
  }
}