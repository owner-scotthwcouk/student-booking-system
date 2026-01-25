// /api/paypal/order-create.js
module.exports = async (req, res) => {
  try {
    // Expect JSON: { reference_id: "booking_123" }
    const body = req.body || {};
    const reference_id = body.reference_id;
    if (!reference_id) return res.status(400).json({ error: "missing reference_id (booking id)" });

    // 1) Get PayPal access token (LIVE)
    const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const tok = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    }).then(r => r.json());
    if (!tok.access_token) return res.status(500).json({ error: "token_failed", details: tok });

    // 2) Create an order for £17.00 GBP
    const r = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          { amount: { currency_code: "GBP", value: "17.00" }, reference_id }
        ],
      }),
    });

    const data = await r.json();
    return res.status(r.status).json(data); // returns { id: "...", ... }
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
