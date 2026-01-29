// src/components/PayNow.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";

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
  const [bookingAmount, setBookingAmount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch booking details and tutor's hourly rate
  useEffect(() => {
    let cancelled = false;

    const fetchBookingAndRate = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!reference) {
          throw new Error("Booking ID is missing");
        }

        // Get booking details
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", reference)
          .single();

        if (bookingError) throw new Error(`Failed to fetch booking: ${bookingError.message}`);
        if (!booking) throw new Error("Booking not found");

        // Get tutor's hourly rate from user_profiles
        const { data: tutorProfile, error: tutorError } = await supabase
          .from("user_profiles")
          .select("hourly_rate")
          .eq("id", booking.tutor_id)
          .single();

        if (tutorError) throw new Error(`Failed to fetch tutor rate: ${tutorError.message}`);
        if (!tutorProfile || tutorProfile.hourly_rate === null) {
          throw new Error("Tutor hourly rate not set");
        }

        // Calculate total cost: hourly_rate × (duration_minutes / 60)
        const durationHours = booking.duration_minutes / 60;
        const totalCost = (tutorProfile.hourly_rate * durationHours).toFixed(2);

        if (!cancelled) {
          setBookingAmount(totalCost);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching booking/rate:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load booking information");
          setLoading(false);
        }
      }
    };

    fetchBookingAndRate();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  // Initialize PayPal buttons once we have the amount
  useEffect(() => {
    let cancelled = false;

    if (bookingAmount === null || loading) return; // Wait for booking data

    (async () => {
      try {
        const paypal = await loadPayPalSdk(PAYPAL_CLIENT_ID);
        if (cancelled || !btnRef.current) return;

        // Clear container in case of re-renders
        btnRef.current.innerHTML = "";

        paypal
          .Buttons({
            // 1) Ask your server to create an order with the calculated amount
            createOrder: async () => {
              try {
                const resp = await fetch("/api/paypal/order-create", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reference_id: reference,
                    value: bookingAmount, // ✅ NOW PASSING THE CORRECT AMOUNT
                    currency_code: "GBP",
                  }),
                });
                const data = await resp.json();
                if (!resp.ok || !data?.id) {
                  throw new Error(data?.error || "createOrder failed");
                }
                return data.id; // PayPal order id
              } catch (err) {
                console.error("createOrder error:", err);
                throw err;
              }
            },
            // 2) After buyer approves, capture on your server and record in Supabase
            onApprove: async ({ orderID }) => {
              try {
                const resp = await fetch(`/api/paypal/order-capture?orderId=${orderID}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    studentId: user?.id || null,
                    bookingId: reference,
                    expectedAmount: bookingAmount, // ✅ SEND FOR SERVER VALIDATION
                  }),
                });
                const data = await resp.json();
                if (!resp.ok) {
                  console.error("Capture failed:", data);
                  alert(`Payment failed: ${data.error || "Unknown error"}`);
                  return;
                }
                // Success UI (replace with your own toast/redirect)
                alert("Payment completed ✅");
                // Optionally redirect to success page
                // window.location.href = '/booking-success';
              } catch (err) {
                console.error("onApprove error:", err);
                alert("Payment processing error. Please try again.");
              }
            },
            onError: (err) => {
              console.error("PayPal Buttons error:", err);
              alert("Payment error. Please try again.");
            },
          })
          .render(btnRef.current);
      } catch (e) {
        console.error("PayPal SDK error:", e);
        if (!cancelled) {
          setError("Could not load PayPal. Check your Client ID.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingAmount, reference, user?.id, loading]);

  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading payment details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "#cc0000", textAlign: "center" }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "10px", marginBottom: "10px", fontSize: "14px" }}>
        Amount to pay: <strong>£{bookingAmount}</strong>
      </div>
      <div ref={btnRef} />
    </div>
  );
}
