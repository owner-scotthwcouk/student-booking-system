// src/components/payment/PayPalPayment.jsx
import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from '../../lib/supabaseClient';

export default function PayPalPayment({ amount, bookingId, onSuccess, onError }) {
  // Use the env variable directly
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Debug: Check if the variable is loaded in the browser console
    console.log("DEBUG: VITE_PAYPAL_CLIENT_ID is:", clientId);
    
    if (clientId && clientId !== 'test') {
      setIsReady(true);
    } else {
      console.error("PayPal Error: VITE_PAYPAL_CLIENT_ID is missing or invalid in your .env");
    }
  }, [clientId]);

  const createOrder = async () => {
    // ... existing logic ...
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
      return orderData.id;
    } catch (err) {
      if (onError) onError(err);
    }
  };

  const onApprove = async (data) => {
    // ... existing logic ...
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
        onSuccess(orderData);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  // Only render the provider if we have a real ID
  if (!isReady) {
    return <div className="text-red-500 text-sm">Payment system configuration error. Please contact support.</div>;
  }

  return (
    <div className="w-full">
      <PayPalScriptProvider options={{ "client-id": clientId, currency: "GBP" }}>
        <PayPalButtons 
          createOrder={createOrder}
          onApprove={onApprove}
          style={{ layout: "vertical", shape: "rect" }}
        />
      </PayPalScriptProvider>
    </div>
  );
}