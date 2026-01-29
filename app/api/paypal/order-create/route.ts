import { NextResponse } from "next/server";
import { createOrder } from "../../_paypal";
import { createClient } from "@supabase/supabase-js";

// Init Supabase Admin to fetch booking details securely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { reference_id } = await req.json(); // bookingId

    if (!reference_id) {
      return NextResponse.json({ error: "Missing reference_id" }, { status: 400 });
    }

    // 1. Fetch booking to get tutor_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("tutor_id")
      .eq("id", reference_id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking lookup failed:", bookingError);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2. Fetch tutor's hourly rate from user_profiles
    // We use booking.tutor_id which corresponds to the user_id in user_profiles
    const { data: tutorProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("hourly_rate")
      .eq("id", booking.tutor_id)
      .single();

    // Default to 30.00 if no custom rate is found or if error occurs
    let price = "30.00"; 

    if (!profileError && tutorProfile?.hourly_rate) {
      // Ensure we format it to 2 decimal places for PayPal (e.g. 25 -> "25.00")
      price = Number(tutorProfile.hourly_rate).toFixed(2);
    }

    // 3. Create PayPal Order with the dynamic price
    const order = await createOrder(price, reference_id);

    return NextResponse.json(order);
  } catch (err: any) {
    console.error("Error creating PayPal order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}