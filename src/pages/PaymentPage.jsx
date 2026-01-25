import { useParams } from "react-router-dom";
import PayNow from "../components/PayNow";

export default function PaymentPage() {
  const { bookingId } = useParams();
  return (
    <div className="card" style={{ padding: 16 }}>
      <h2>Pay for your session</h2>
      <PayNow reference={bookingId} />
    </div>
  );
}
