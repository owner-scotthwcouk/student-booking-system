import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PayPalPayment from '../components/payment/PayPalPayment';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect if no booking data
  const { amount, bookingId } = location.state || { amount: 0, bookingId: null };

  const handleSuccess = () => {
    navigate('/student/dashboard?payment=success');
  };

  const handleError = (error) => {
    console.error('Payment failed:', error);
    alert("Payment failed. Please try again.");
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
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Complete Payment
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Amount Due: £{amount.toFixed(2)}
        </p>

        <div className="mt-8">
          <PayPalPayment 
            amount={amount} 
            bookingId={bookingId} 
            onSuccess={handleSuccess} 
            onError={handleError} 
          />
        </div>
      </div>
    </div>
  );
}
