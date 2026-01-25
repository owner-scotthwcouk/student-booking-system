// src/components/PayNow.jsx
import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

// ⬇️ Replace this with your real LIVE PayPal Client ID (Client ID is public/safe)
const PAYPAL_CLIENT_ID = "ARKGneSziYvAKp3hl_1y0kyid7aSRAbJD-EYOHreBPEtfCl3U56kkgOPuj-fYLRYmPg58BUC_fOfAsIo";

// Load the PayPal JS SDK (only once)
function loadPayPalSdk(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=GBP&intent=capture`;
    s.async = true;
    s.onload = () =>
      window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK failed to load"));
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function PayNow({ reference }) {
  // `reference` should be your bookingId (string/UUID)
  const { user } = useAuth(); // so we can store student_id on capture
  const btnRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const paypal = await loadPayPalSdk(PAYPAL_CLIENT_ID);
        if (cancelled || !btnRef.current) return;

        // Clear container in case of re-renders
        btnRef.current.innerHTML = "";

        paypal
          .Buttons({
            // 1) Ask your server to create an order (amount defined server-side)
            createOrder: async () => {
              const resp = await fetch("/api/paypal/order-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference_id: reference }),
              });
              const data = await resp.json();
              if (!resp.ok || !data?.id) {
                throw new Error(data?.error || "createOrder failed");
              }
              return data.id; // PayPal order id
            },

            // 2) After buyer approves, capture on your server and record in Supabase
            onApprove: async ({ orderID }) => {
              const resp = await fetch(`/api/paypal/order-capture?orderId=${orderID}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: user?.id || null }),
              });
              const data = await resp.json();
              if (!resp.ok) {
                console.error("Capture failed:", data);
                alert("Payment failed. Please try again.");
                return;
              }
              // Success UI (replace with your own toast/redirect)
              alert("Payment completed ✅");
            },

            onError: (err) => {
              console.error("PayPal Buttons error:", err);
              alert("Payment error. Please try again.");
            },
          })
          .render(btnRef.current);
      } catch (e) {
        console.error(e);
        alert("Could not load PayPal. Check your Client ID.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, user?.id]);

  return <div ref={btnRef} />;
}
