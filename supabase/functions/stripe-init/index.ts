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

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);
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

    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", studentId)
      .single();

    if (profileError) {
      throw profileError;
    }

    const sessionBase = {
      mode: "payment",
      customer_email: email || undefined,
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
      cancel_url: `${frontendUrl}/payment/${encodeURIComponent(bookingId)}`,
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
    } as const;

    const session = await stripe.checkout.sessions.create(
      profile?.stripe_customer_id
        ? {
            ...sessionBase,
            customer: profile.stripe_customer_id,
            customer_creation: "if_required",
          }
        : {
            ...sessionBase,
            customer_creation: "always",
          },
    );

    return new Response(
      JSON.stringify({ checkout_url: session.url, session_id: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("stripe-init failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to initialize Stripe checkout",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
