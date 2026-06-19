import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^17.7.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY is not configured");
}

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const { data: userResult, error: userError } = await authSupabase.auth.getUser();
    const user = userResult?.user;

    if (userError || !user) {
      return json(401, { error: "Unauthorized" });
    }

    const payload = await req.json();
    const bookingId = String(payload?.bookingId || "");
    const sessionId = String(payload?.sessionId || "");

    if (!bookingId || !sessionId) {
      return json(400, { error: "bookingId and sessionId are required" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, student_id, tutor_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return json(404, { error: "Booking not found" });
    }

    if (booking.student_id !== user.id && booking.tutor_id !== user.id) {
      return json(403, { error: "Forbidden" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.booking_id !== bookingId) {
      return json(400, { error: "Checkout session does not match the booking" });
    }

    if (session.payment_status !== "paid") {
      return json(409, { error: "Checkout session is not marked as paid" });
    }

    const studentId = session.metadata?.student_id || booking.student_id;
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
    const transactionReference =
      typeof session.payment_intent === "string" ? session.payment_intent : session.id;
    const amount = Number(session.amount_total || 0) / 100;

    if (stripeCustomerId) {
      const { error: customerUpdateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", studentId);

      if (customerUpdateError) {
        console.warn("Failed to persist Stripe customer id:", customerUpdateError);
      }
    }

    const paymentPayload = {
      booking_id: bookingId,
      student_id: studentId,
      tutor_id: booking.tutor_id || null,
      amount,
      currency: "GBP",
      payment_method: "stripe",
      transaction_reference: transactionReference,
      order_reference: session.id,
      status: "completed",
      payment_date: new Date().toISOString(),
    };

    const { data: existingPayments, error: existingPaymentError } = await supabase
      .from("payments")
      .select("id, booking_id, student_id, tutor_id")
      .eq("transaction_reference", transactionReference)
      .limit(1);

    if (existingPaymentError) {
      return json(500, { error: existingPaymentError.message });
    }

    if (!existingPayments || existingPayments.length === 0) {
      const { error: insertError } = await supabase.from("payments").insert(paymentPayload);
      if (insertError) {
        return json(500, { error: insertError.message });
      }
    } else {
      const existingPayment = existingPayments[0];
      const needsRepair =
        !existingPayment?.tutor_id ||
        !existingPayment?.booking_id ||
        existingPayment.booking_id !== bookingId ||
        existingPayment.student_id !== studentId;

      if (needsRepair) {
        const { error: repairError } = await supabase
          .from("payments")
          .update(paymentPayload)
          .eq("id", existingPayment.id);

        if (repairError) {
          return json(500, { error: repairError.message });
        }
      }
    }

    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ status: "confirmed", payment_status: "paid", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (bookingUpdateError) {
      return json(500, { error: bookingUpdateError.message });
    }

    return json(200, {
      ok: true,
      bookingId,
      sessionId,
      transactionReference,
    });
  } catch (error) {
    console.error("stripe-reconcile failed:", error);
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message || "Failed to reconcile Stripe payment")
        : String(error || "Failed to reconcile Stripe payment");
    return json(500, { error: errorMessage });
  }
});
