// /api/paypal/order-capture.js

module.exports = async (req, res) => {
  try {
    // 0) Inputs
    const orderId = req.query?.orderId || (req.body && req.body.orderId);
    const studentId = req.body && req.body.studentId ? req.body.studentId : null; // optional
    if (!orderId) return res.status(400).json({ error: "missing orderId" });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    // 1) PayPal access token (LIVE)
    const basic = Buffer
      .from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`)
      .toString("base64");

    const tokResp = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tok = await tokResp.json();
    if (!tokResp.ok) return res.status(500).json({ error: "token_failed", details: tok });

    // 2) Capture the order
    const capResp = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
    });
    const data = await capResp.json();
    if (!capResp.ok) return res.status(capResp.status).json(data);

    // 3) Pull fields for your table
    const pu = data?.purchase_units?.[0] || {};
    const capture = pu?.payments?.captures?.[0] || {};
    const bookingId = pu?.reference_id || null;             // set in order-create
    const amount = capture?.amount?.value || "0.00";
    const currency = capture?.amount?.currency_code || "GBP";
    const status = capture?.status || data?.status || "COMPLETED";
    const captureId = capture?.id || null;                  // -> payment_transaction_id
    const nowIso = new Date().toISOString();

    // 4) Build row for YOUR existing columns
    const row = {
      booking_id: bookingId,                      // UUID
      student_id: studentId,                      // UUID (optional)
      amount: Number(amount),                     // numeric
      currency: currency,                         // text
      payment_method: "paypal",                   // text
      payment_transaction_id: captureId,          // text
      paypal_order_id: orderId,                   // text
      status: status,                             // text
      payments_date: nowIso,                      // timestamptz
      // created_at is DB default; we don't set it here
    };

    // 5) Insert into Supabase
    const sbResp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });

    if (!sbResp.ok) {
      const txt = await sbResp.text();
      console.error("Supabase insert failed:", sbResp.status, txt);
      // We still return capture success to the browser
    }

    return res.status(200).json({
      ok: true,
      orderId,
      captureId,
      status,
      bookingId,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
