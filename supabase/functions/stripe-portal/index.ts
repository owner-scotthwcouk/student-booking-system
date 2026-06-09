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
    const authHeader = req.headers.get("Authorization");
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const { data: userResult, error: userError } = await authSupabase.auth.getUser();
    const user = userResult?.user;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to load profile: ${profileError.message || String(profileError)}`);
    }

    let stripeCustomerId = profile?.stripe_customer_id || null;

    if (!stripeCustomerId) {
      let customer;
      try {
        customer = await stripe.customers.create({
          email: profile?.email || user.email || undefined,
          metadata: {
            supabase_user_id: user.id,
          },
        });
      } catch (stripeCustomerError) {
        throw new Error(
          `Failed to create Stripe customer: ${
            stripeCustomerError instanceof Error
              ? stripeCustomerError.message
              : String(stripeCustomerError)
          }`,
        );
      }

      stripeCustomerId = customer.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(`Failed to store Stripe customer id: ${updateError.message || String(updateError)}`);
      }
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL");
    if (!frontendUrl) {
      return new Response(JSON.stringify({ error: "FRONTEND_URL is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${frontendUrl}/student?portal=returned`,
      });
    } catch (portalError) {
      throw new Error(
        `Failed to create billing portal session: ${
          portalError instanceof Error ? portalError.message : String(portalError)
        }`,
      );
    }

    return new Response(
      JSON.stringify({ portal_url: portalSession.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("stripe-portal failed:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error || "Failed to open Stripe customer portal");

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
