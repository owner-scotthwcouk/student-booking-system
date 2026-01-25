// /api/paypal/order-capture.js
module.exports = async (req, res) => {
  try {
    const orderId = req.query.orderId || (req.body && req.body.orderId);
    if (!orderId) return res.status(400).json({ error: "missing orderId" });

    const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const tok = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    }).then(r => r.json());
    if (!tok.access_token) return res.status(500).json({ error: "token_failed", details: tok });

    const r = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
