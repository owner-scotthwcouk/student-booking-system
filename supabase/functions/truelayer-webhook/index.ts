import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  const body = await req.json();
  const eventType = body.type;

  if (eventType === "payment_authorized" || eventType === "payment_settled") {
    const paymentId = body.payment_id;

    // Logic to update your booking status
    await supabase
      .from("payments")
      .update({ status: "completed" })
      .eq("transaction_id", paymentId);
  }

  return new Response("OK", { status: 200 });
});
