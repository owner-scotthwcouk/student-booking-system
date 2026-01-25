import { useEffect, useRef } from "react";

// Loads the PayPal SDK in the page
function loadPayPalSdk(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=GBP&intent=capture`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("SDK failed to load")));
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function PayNow({ reference }) {
  const ref = useRef(null);

  useEffect(() => {
    (async () => {
      // TEMP: paste your Live Client ID here (Client ID is public/safe)
      const paypal = await loadPayPalSdk("YOUR_LIVE_CLIENT_ID_HERE");

      paypal.Buttons({
        createOrder: async () => {
          const r = await fetch("/api/paypal/order-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference_id: reference }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(JSON.stringify(j));
          return j.id; // PayPal order id
        },
        onApprove: async ({ orderID }) => {
          const r = await fetch(`/api/paypal/order-capture?orderId=${orderID}`, { method: "POST" });
          const j = await r.json();
          if (!r.ok) throw new Error(JSON.stringify(j));
          alert("Payment completed ✅");
        },
      }).render(ref.current);
    })();
  }, [reference]);

  return <div ref={ref} />;
}
