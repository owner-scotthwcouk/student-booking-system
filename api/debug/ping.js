// /api/debug/ping.js
module.exports = async (req, res) => {
  res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    has_PAYPAL_ID: Boolean(process.env.PAYPAL_CLIENT_ID),
    has_PAYPAL_SECRET: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    has_SB_URL: Boolean(process.env.SUPABASE_URL),
    has_SB_SVC: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
};
