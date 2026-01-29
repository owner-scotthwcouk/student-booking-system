// api/paypal/order-capture.js
import { BASE, getAccessToken } from './_client';
import { supabase } from '../../src/lib/supabaseClient'; // ✅ Import Supabase

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderID } = req.body || {};
    if (!orderID) {
      return res.status(400).json({ error: 'missing_orderID' });
    }

    // Extract booking details from request
    const { bookingId, expectedAmount } = req.body;

    // Get PayPal access token
    const accessToken = await getAccessToken();

    // Capture the payment from PayPal
    const r = await fetch(`${BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
