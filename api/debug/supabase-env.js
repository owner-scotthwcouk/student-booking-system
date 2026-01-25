export default async function handler(req, res) {
  res.json({
    has_URL: Boolean(process.env.SUPABASE_URL),
    has_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
