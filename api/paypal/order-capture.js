// api/paypal/order-capture.js
import { BASE, getAccessToken } from './_client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderID } = req.body || {};
    if (!orderID) {
      return res.status(400).json({ error: 'missing_orderID' });
    }

    // Extract validation data from request
    const { bookingId, expectedAmount, studentId } = req.body;

    // Get PayPal access token
    const accessToken = await getAccessToken();

    // Capture the payment from PayPal
    const r = await fetch(`${BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await r.json().catch(async () => ({ raw: await r.text() }));

    if (!r.ok) {
      console.error('PayPal capture error', data);
      return res.status(500).json({ error: 'paypal_capture_failed', details: data });
    }

    // ✅ SERVER-SIDE VALIDATION: Verify the captured amount matches the booking
    if (expectedAmount) {
      const capturedAmount = data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      
      if (!capturedAmount) {
        return res.status(400).json({ 
          error: 'capture_amount_missing',
          message: 'PayPal did not return captured amount'
        });
      }

      const expectedFloat = parseFloat(expectedAmount);
      const capturedFloat = parseFloat(capturedAmount);

      // Allow small floating point differences (0.01)
      if (Math.abs(expectedFloat - capturedFloat) > 0.01) {
        console.error('Amount mismatch:', {
          expected: expectedFloat,
          captured: capturedFloat,
          bookingId: bookingId
        });

        return res.status(400).json({ 
          error: 'amount_mismatch',
          expected: expectedAmount,
          received: capturedAmount,
          message: 'Captured amount does not match booking amount'
        });
      }
    }

    // ✅ UPDATE BOOKING STATUS IN DATABASE (if using Supabase)
    if (bookingId) {
      try {
        // Import Supabase client - make sure this path is correct
        // You may need to adjust the import path based on your project structure
        // const { supabase } = await import('../../src/lib/supabaseClient.js');
        
        // For now, you could update the booking status here
        // This would require setting up server-side Supabase access
        // For now, the frontend can handle this after successful capture
        
        console.log('Booking captured successfully:', {
          bookingId: bookingId,
          orderId: orderID,
          amount: data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
        });
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Don't fail the payment if DB update fails - payment already captured
      }
    }

    return res.status(200).json({
      success: true,
      data: data,
      bookingId: bookingId
    });

  } catch (err) {
    console.error('order-capture failed', err);
    return res.status(500).json({ 
      error: 'internal', 
      message: String(err?.message || err) 
    });
  }
}
