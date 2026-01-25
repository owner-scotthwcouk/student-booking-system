export async function loadPayPalSdk() {
  if (window.paypal) return window.paypal;
  const id = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  if (!id) throw new Error("Missing VITE_PAYPAL_CLIENT_ID");

  const s = document.createElement("script");
  s.src = `https://www.paypal.com/sdk/js?client-id=${id}&currency=GBP&intent=capture`;
  s.async = true;
  document.head.appendChild(s);

  await new Promise((res, rej) => {
    s.onload = () => (window.paypal ? res() : rej(new Error("SDK failed to load")));
    s.onerror = rej;
  });
  return window.paypal;
}
