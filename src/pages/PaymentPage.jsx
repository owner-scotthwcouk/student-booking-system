import { useParams } from "react-router-dom";
import StripePayment from "../components/payment/StripePayment";

export default function PaymentPage() {
  const { bookingId } = useParams();
  return (
    <div className="card" style={{ padding: 16 }}>
      <h2>Pay for your session</h2>
      <StripePayment bookingId={bookingId} />
    </div>
  );
}
