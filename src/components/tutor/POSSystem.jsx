import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAllStudents, getTutorHourlyRate } from '../../lib/profileAPI'
import { createBooking } from '../../lib/bookingAPI'
import { supabase } from '../../lib/supabaseClient'

export default function POSSystem() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(30.00) // Default fallback

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    reason: 'Lesson', // Default reason
    lessonDate: '',
    lessonTime: '09:00', // Keeping time to ensure booking validity
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
      email: student ? student.email : '' // Auto-fill email
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

      // 2. Mark Booking as Paid & Confirmed (Since we took payment via POS)
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed', 
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (updateError) throw updateError

      // 3. Record the Payment in the Database
      // Note: We DO NOT store the card number/cvv for security (PCI) reasons.
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
          // We can optionally store the reason or cardholder name if we extend the table
          paypal_transaction_id: `POS-${Date.now()}` // Fake ID for internal ref
        })

      if (paymentError) throw paymentError

      setSuccess(true)
      // Reset form (except rate)
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
      setError(err.message || 'Failed to process transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pos-system-container">
      <h2>POS System</h2>
      <p className="description">Enter payment details manually to book and charge immediately.</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Payment processed and booking confirmed!</div>}

      <form onSubmit={handleSubmit} className="pos-form">
        <div className="form-grid">
          {/* Section 1: Booking Details */}
          <div className="form-section">
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
                readOnly // Auto-filled from student
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
              <div className="price-display">£{Number(hourlyRate).toFixed(2)}</div>
            </div>
          </div>

          {/* Section 2: Payment Details */}
          <div className="form-section">
            <h3>Card Details</h3>
            
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
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn-large btn-block">
          {loading ? 'Processing Payment...' : `Charge £${Number(hourlyRate).toFixed(2)}`}
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
        .form-section {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        .form-section h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 0.5rem;
        }
        .form-row {
          display: flex;
          gap: 1rem;
        }
        .form-row .form-group {
          flex: 1;
        }
        .price-display {
          font-size: 1.5rem;
          font-weight: bold;
          color: #2c3e50;
        }
        .bg-gray {
          background-color: #e9ecef;
        }
        .btn-block {
          width: 100%;
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