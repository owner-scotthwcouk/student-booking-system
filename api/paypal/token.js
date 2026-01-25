// /api/paypal/token.js  (Vercel Serverless Function, Node 18+)
module.exports = async (req, res) => {
  try {
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!id || !secret) {
      return res.status(500).json({ error: "missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET" });
    }

    const basic = Buffer.from(`${id}:${secret}`).toString("base64");

    const r = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await r.json();
    // Pass through PayPal's status (200 on success, 401 on bad creds, etc.)
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
