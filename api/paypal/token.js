// api/paypal/token.js
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { fetchPayPalToken } = await import('./_client.js'); // NOTE: extension is required
    const result = await fetchPayPalToken();

    if (!result.ok) {
      return res.status(result.status).json({ error: 'paypal_error', details: result.json });
    }
    return res.status(200).json(result.json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'FUNCTION_INVOCATION_FAILED',
      message: err?.message ?? 'Unknown error'
    });
  }
}