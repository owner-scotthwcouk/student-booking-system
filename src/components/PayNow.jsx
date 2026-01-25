import { useEffect, useRef } from "react";
import { loadPayPalSdk } from "../lib/loadPayPalSdk";

export default function PayNow({ amountGBP = "50.00", reference }) {
  const ref = useRef(null);

  useEffect(() => {
    (async () => {
      const paypal = await loadPayPalSdk();
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
          // TODO: update UI or reload booking data
        },
      }).render(ref.current);
    })();
  }, [amountGBP, reference]);

  return <div ref={ref} />;
}
