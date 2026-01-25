import { getAccessToken } from './_client';

export default async function handler(_req, res) {
  try {
    const access_token = await getAccessToken();
    res.status(200).json({ access_token });
  } catch (e) {
    res.status(500).json({ error: 'token_failed', message: String(e?.message || e) });
  }
}
