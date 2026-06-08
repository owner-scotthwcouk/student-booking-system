// src/components/payment/PayPalPayment.jsx
import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from '../../lib/supabaseClient';

export default function PayPalPayment({ amount, bookingId, onSuccess, onError }) {
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    setClientId(import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test');
  }, []);

  const createOrder = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/paypal-create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ amount, bookingId })
      });

      const orderData = await response.json();

      if (orderData.id) {
        return orderData.id;
      } else {
        throw new Error('Could not create order');
      }
    } catch (err) {
      setError('Could not initiate PayPal checkout.');
      if (onError) onError(err);
    }
  };

  const onApprove = async (data) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/paypal-capture-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ orderId: data.orderID, bookingId })
      });

      const orderData = await response.json();

      if (orderData.status === 'COMPLETED') {
        const { error: dbError } = await supabase
          .from('payments')
          .insert({
            booking_id: bookingId,
            amount: amount,
            status: 'completed',
            payment_method: 'paypal',
            transaction_id: orderData.id
          });

        if (dbError) throw dbError;
        if (onSuccess) onSuccess(orderData);
      } else {
        throw new Error('Payment not completed');
      }
    } catch (err) {
      setError('Payment capture failed. Please try again.');
      if (onError) onError(err);
    }
  };

  if (!clientId) return null;

  return (
    <div className="w-full">
      {error && <div className="text-red-500 mb-4 text-center text-sm">{error}</div>}
      <PayPalScriptProvider options={{ "client-id": clientId, currency: "GBP" }}>
        <PayPalButtons 
          createOrder={createOrder}
          onApprove={onApprove}
          onError={() => setError("An error occurred during the transaction")}
          style={{ layout: "vertical", shape: "rect" }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
