import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function PayPalPayment({ amount, bookingId, onSuccess, onError }) {
  // HARD CODED FOR TESTING
  const clientId = "YOUR_CLIENT_ID_HERE"; 
  
  console.log("DEBUG: Using Client ID:", clientId);

  if (!clientId || clientId === "AaceKn590W9TDiod6Z4I5PU976UadMXXkfB2-mN4V0tm6AI2r1tytZd_tkYMOfImV0J6hosExyVidbaE") {
    return <div style={{color: 'red'}}>Error: You must paste your Client ID into the code!</div>;
  }

  return (
    <div className="w-full">
      <PayPalScriptProvider options={{ "client-id": clientId, currency: "GBP" }}>
        <PayPalButtons 
          style={{ layout: "vertical", shape: "rect" }}
          onApprove={(data) => console.log("Payment approved:", data)}
        />
      </PayPalScriptProvider>
    </div>
  );
}