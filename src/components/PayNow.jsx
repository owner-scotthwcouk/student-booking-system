import { useEffect, useRef } from "react";

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

export default function PayNow({ amountGBP = "1.00", reference }) {
  const ref = useRef(null);

  useEffect(() => {
    (async () => {
      const paypal = await loadPayPalSdk("AYourLiveClientID"); // OK to hardcode (Client ID is public)
      paypal.Buttons({
        createOrder: async () => {
          const r = await fetch("/api/paypal/order-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: amountGBP, currency_code: "GBP", reference_id: reference }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(JSON.stringify(j));
          return j.id;
        },
        onApprove: async ({ orderID }) => {
          const r = await fetch(`/api/paypal/order-capture?orderId=${orderID}`, { method: "POST" });
          if (!r.ok) throw new Error(await r.text());
          // TODO: show success / refresh booking
        },
      }).render(ref.current);
    })();
  }, [amountGBP, reference]);

  return <div ref={ref} />;
}
