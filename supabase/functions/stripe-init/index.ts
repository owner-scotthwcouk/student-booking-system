import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^17.7.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is not configured");
}
if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { amount, bookingId, studentId, email } = await req.json();
    const amountValue = Number(amount);
    const authHeader = req.headers.get("Authorization");
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const { data: userResult, error: userError } = await authSupabase.auth.getUser();
    const currentUser = userResult?.user;

    if (!bookingId || !studentId || !Number.isFinite(amountValue) || amountValue <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid amount, bookingId, or studentId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (userError || !currentUser || currentUser.id !== studentId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized payment request" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL");
    if (!frontendUrl) {
      return new Response(
        JSON.stringify({ error: "FRONTEND_URL is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      customer_creation: "always",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(amountValue * 100),
            product_data: {
              name: `Lesson booking ${bookingId}`,
            },
          },
        },
      ],
      success_url: `${frontendUrl}/student?payment=success&booking_id=${encodeURIComponent(bookingId)}`,
      cancel_url: `${frontendUrl}/payment/${encodeURIComponent(bookingId)}?cancelled=1`,
      metadata: {
        booking_id: bookingId,
        student_id: studentId,
        student_email: email || "",
      },
      payment_intent_data: {
        metadata: {
          booking_id: bookingId,
          student_id: studentId,
          student_email: email || "",
        },
      },
    });

    return new Response(
      JSON.stringify({ checkout_url: session.url, session_id: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("stripe-init failed:", error);
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message || "Failed to initialize Stripe checkout")
        : String(error || "Failed to initialize Stripe checkout");
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
