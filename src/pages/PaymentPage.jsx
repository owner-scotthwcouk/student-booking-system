// src/pages/PaymentPage.jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StripePayment from '../components/payment/StripePayment';
import PayPalPayment from '../components/payment/PayPalPayment';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('stripe');

  const { amount, bookingId } = location.state || { amount: 0, bookingId: null };

  const handleSuccess = () => {
    navigate('/student/dashboard?payment=success');
  };

  const handleError = (error) => {
    console.error('Payment failed:', error);
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500">Invalid payment details.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Payment
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Amount Due: £{amount.toFixed(2)}
          </p>
        </div>

        <div className="flex justify-center space-x-4 mb-6 border-b pb-4">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              paymentMethod === 'stripe' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setPaymentMethod('stripe')}
          >
            Card
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              paymentMethod === 'paypal' 
                ? 'bg-[#0070ba] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setPaymentMethod('paypal')}
          >
            PayPal
          </button>
        </div>

        <div className="mt-8">
          {paymentMethod === 'stripe' ? (
            <StripePayment 
              amount={amount} 
              bookingId={bookingId} 
              onSuccess={handleSuccess} 
              onError={handleError} 
            />
          ) : (
            <PayPalPayment 
              amount={amount} 
              bookingId={bookingId} 
              onSuccess={handleSuccess} 
              onError={handleError} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
