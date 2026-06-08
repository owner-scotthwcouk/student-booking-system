import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/auth.jsx';
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

// Ensure you only load PayPal here, NOT Stripe
const paypalOptions = {
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX, // Use the appropriate Env Var
  currency: "GBP",
  intent: "capture",
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PayPalScriptProvider>
  </React.StrictMode>,
);
