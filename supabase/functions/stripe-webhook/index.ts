import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^17.7.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
}

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await req.text();

  try {
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      const studentId = session.metadata?.student_id || null;
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
      const transactionReference =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.id;
      const amount = Number(session.amount_total || 0) / 100;

      if (!bookingId || !studentId) {
        console.error("stripe-webhook missing booking or student metadata", {
          eventId: event.id,
          sessionId: session.id,
          bookingId,
          studentId,
        });
        return new Response("OK", { status: 200 });
      }

      const { data: booking, error: bookingLookupError } = await supabase
        .from("bookings")
        .select("tutor_id")
        .eq("id", bookingId)
        .single();

      if (bookingLookupError) {
        console.error("stripe-webhook could not load booking", {
          eventId: event.id,
          sessionId: session.id,
          bookingId,
          error: bookingLookupError,
        });
        return new Response("OK", { status: 200 });
      }

      if (stripeCustomerId) {
        const { error: customerUpdateError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", studentId);

        if (customerUpdateError) {
          console.warn("Failed to persist Stripe customer id:", customerUpdateError);
        }
      }

      const { data: existingPayments, error: existingPaymentError } = await supabase
        .from("payments")
        .select("id, booking_id, student_id, tutor_id, amount, currency, payment_method, status, payment_date, order_reference")
        .eq("transaction_reference", transactionReference)
        .limit(1);

      if (existingPaymentError) {
        console.error("stripe-webhook failed to check for existing payment", {
          eventId: event.id,
          sessionId: session.id,
          bookingId,
          error: existingPaymentError,
        });
        return new Response("OK", { status: 200 });
      }

      const paymentPayload = {
        booking_id: bookingId,
        student_id: studentId,
        tutor_id: booking?.tutor_id || null,
        amount,
        currency: "GBP",
        payment_method: "stripe",
        transaction_reference: transactionReference,
        order_reference: session.id,
        status: "completed",
        payment_date: new Date().toISOString(),
      };

      if (!existingPayments || existingPayments.length === 0) {
        const { error: insertError } = await supabase.from("payments").insert({
          ...paymentPayload,
        });

        if (insertError) {
          console.error("stripe-webhook failed to persist payment", {
            eventId: event.id,
            sessionId: session.id,
            bookingId,
            error: insertError,
          });
          return new Response("OK", { status: 200 });
        }
      } else {
        const existingPayment = existingPayments[0];
        const requiresRepair =
          !existingPayment?.tutor_id ||
          !existingPayment?.booking_id ||
          existingPayment?.booking_id !== bookingId ||
          existingPayment?.student_id !== studentId;

        if (requiresRepair) {
          const { error: repairError } = await supabase
            .from("payments")
            .update(paymentPayload)
            .eq("id", existingPayment.id);

          if (repairError) {
            console.error("stripe-webhook failed to repair existing payment", {
              eventId: event.id,
              sessionId: session.id,
              bookingId,
              paymentId: existingPayment.id,
              error: repairError,
            });
            return new Response("OK", { status: 200 });
          }
        }
      }

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("id", bookingId);

      if (bookingError) {
        console.error("stripe-webhook failed to update booking", {
          eventId: event.id,
          sessionId: session.id,
          bookingId,
          error: bookingError,
        });
        return new Response("OK", { status: 200 });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("stripe-webhook failed:", error);
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message || "Invalid signature or payload")
        : String(error || "Invalid signature or payload");
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
