import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getStudentPayments } from '../../lib/paymentsAPI'
import { CreditCard, AlertCircle } from 'lucide-react'

export default function StudentPayments({ studentId }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (studentId) {
      loadPayments()
    }
  }, [studentId])

  async function loadPayments() {
    try {
      setLoading(true)
      const { data, error } = await getStudentPayments(studentId)
      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="payments-container">
      {/* Summary Cards */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%' }}>
           <CreditCard size={32} color="#22c55e" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Spent</h3>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
            £{totalPaid.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Payment History</h3>
        {error && <div className="error-message"><AlertCircle size={16}/> {error}</div>}
        
        {loading ? (
          <p>Loading payments...</p>
        ) : payments.length === 0 ? (
          <p className="text-muted">No payments found.</p>
        ) : (
          <div className="table-responsive">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td>Lesson Booking</td>
                    <td style={{ fontWeight: 'bold' }}>£{Number(payment.amount).toFixed(2)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{payment.payment_method?.replace(/_/g, ' ') || 'Card'}</td>
                    <td>
                      <span className={`status-badge ${payment.status}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}