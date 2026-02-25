import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/auth'
import { getAllStudents, getTutorHourlyRate } from '../../lib/profileAPI'
import { createBooking } from '../../lib/bookingAPI'
import { supabase } from '../../lib/supabaseClient'

export default function POSSystem() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [collectPaymentNow, setCollectPaymentNow] = useState(true)
  const [hourlyRate, setHourlyRate] = useState(30.00)

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    reason: 'Lesson',
    lessonDate: '',
    lessonTime: '09:00',
    email: '',
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    postCode: ''
  })

  const loadStudents = useCallback(async () => {
    try {
      const { data } = await getAllStudents()
      setStudents(data || [])
    } catch (err) {
      console.error('Failed to load students', err)
    }
  }, [])

  const loadRate = useCallback(async () => {
    try {
      const { data } = await getTutorHourlyRate(user.id)
      if (data && data.hourly_rate) {
        setHourlyRate(data.hourly_rate)
      }
    } catch (err) {
      console.error('Failed to load rate', err)
    }
  }, [user.id])

  useEffect(() => {
    if (user) {
      loadStudents()
      loadRate()
    }
  }, [user, loadStudents, loadRate])

  const handleStudentChange = (e) => {
    const studentId = e.target.value
    const student = students.find(s => s.id === studentId)

    setFormData(prev => ({
      ...prev,
      studentId,
      email: student ? student.email : ''
    }))
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 1. Create the Booking
      const { data: booking, error: bookingError } = await createBooking({
        studentId: formData.studentId,
        tutorId: user.id,
        lessonDate: formData.lessonDate,
        lessonTime: formData.lessonTime,
        duration: 60
      })

      if (bookingError) throw bookingError

      if (collectPaymentNow) {
        // 2. Mark Booking as Paid & Confirmed
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id)

        if (updateError) throw updateError

        // 3. Record the Payment
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            student_id: formData.studentId,
            amount: hourlyRate,
            currency: 'GBP',
            payment_method: 'pos_card_entry',
            status: 'completed',
            payment_date: new Date().toISOString(),
            paypal_transaction_id: `POS-${Date.now()}`
          })

        if (paymentError) throw paymentError
      } else {
        // Create booking on behalf of the student without taking payment.
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'unpaid',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id)

        if (updateError) throw updateError
      }

      setSuccess(true)
      setFormData({
        studentId: '',
        reason: 'Lesson',
        lessonDate: '',
        lessonTime: '09:00',
        email: '',
        cardholderName: '',
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        postCode: ''
      })
    } catch (err) {
      setError(err.message || (collectPaymentNow ? 'Failed to process transaction' : 'Failed to create booking'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pos-system-container">
      <h2>POS System</h2>
      <p className="description">Create bookings on behalf of students, with or without taking payment now.</p>

      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">
          {collectPaymentNow
            ? 'Payment processed and booking confirmed!'
            : 'Booking created for student without payment.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="pos-form">
        <div className="form-section lilac-card" style={{ marginBottom: '1rem' }}>
          <h3>Checkout Mode</h3>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={collectPaymentNow}
                onChange={(e) => setCollectPaymentNow(e.target.checked)}
              />
              Collect payment now
            </label>
            <small style={{ color: '#374151' }}>
              Turn this off to create a confirmed booking without charging the student.
            </small>
          </div>
        </div>

        <div className="form-grid">
          {/* Section 1: Booking Details */}
          <div className="form-section lilac-card">
            <h3>Booking Details</h3>

            <div className="form-group">
              <label htmlFor="studentId">Name of Student *</label>
              <select
                id="studentId"
                value={formData.studentId}
                onChange={handleStudentChange}
                required
              >
                <option value="">Select a student...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                readOnly
                className="bg-gray"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason for payment *</label>
              <input
                type="text"
                id="reason"
                value={formData.reason}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lessonDate">Lesson Date</label>
                <input
                  type="date"
                  id="lessonDate"
                  value={formData.lessonDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lessonTime">Time</label>
                <input
                  type="time"
                  id="lessonTime"
                  value={formData.lessonTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Total Amount to Charge</label>
              <div className="price-display">Â£{Number(hourlyRate).toFixed(2)}</div>
            </div>
          </div>

          {/* Section 2: Payment Details */}
          <div className="form-section lilac-card">
            <h3>Card Details</h3>

            {collectPaymentNow ? (
              <>
                <div className="form-group">
                  <label htmlFor="cardholderName">Name of Cardholder *</label>
                  <input
                    type="text"
                    id="cardholderName"
                    value={formData.cardholderName}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cardNumber">Card Number</label>
                  <input
                    type="text"
                    id="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    placeholder="0000 0000 0000 0000"
                    maxLength="19"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryDate">Expiry Date</label>
                    <input
                      type="text"
                      id="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      placeholder="MM/YY"
                      maxLength="5"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cvv">CVV</label>
                    <input
                      type="text"
                      id="cvv"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="postCode">Post Code</label>
                  <input
                    type="text"
                    id="postCode"
                    value={formData.postCode}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: '#374151' }}>
                Payment details are skipped. The booking will be confirmed and saved as unpaid.
              </p>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn-large btn-block">
          {loading
            ? (collectPaymentNow ? 'Processing Payment...' : 'Creating Booking...')
            : (collectPaymentNow ? `Charge Â£${Number(hourlyRate).toFixed(2)}` : 'Create Booking (Unpaid)')}
        </button>
      </form>

      <style jsx>{`
        .pos-form {
          max-width: 800px;
          margin: 0 auto;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .lilac-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.17), rgba(255,255,255,0.08)) !important;
          color: #e5e5e5 !important;
          border: 1px solid rgba(255,255,255,0.25);
          padding: 1.5rem;
          border-radius: 16px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
          transition: all 0.2s ease;
        }
        .lilac-card:hover {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.45);
        }
        .lilac-card h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          padding-bottom: 0.5rem;
          color: #fff;
        }
        .lilac-card label {
          color: #e5e5e5;
          font-weight: 500;
          margin-bottom: 4px;
          display: block;
        }
        /* Ensure inputs inside glass card are readable */
        .lilac-card input,
        .lilac-card select {
          background-color: rgba(30, 41, 59, 0.8);
          color: #e5e5e5;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 8px;
          border-radius: 8px;
          width: 100%;
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }
        .lilac-card input:focus,
        .lilac-card select:focus {
          background-color: rgba(30, 41, 59, 0.9);
          border-color: rgba(99, 102, 241, 0.5);
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .form-row {
          display: flex;
          gap: 1rem;
        }
        .form-row .form-group {
          flex: 1;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .price-display {
          font-size: 1.5rem;
          font-weight: bold;
          color: #93c5fd;
          background: rgba(59, 130, 246, 0.1);
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .bg-gray {
          background-color: rgba(107, 114, 128, 0.1) !important;
          color: #9ca3af !important;
        }
        .btn-block {
          width: 100%;
          padding: 1rem;
          font-size: 1.1rem;
        }
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
