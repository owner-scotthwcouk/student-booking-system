import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getStudentPayments } from '../../lib/paymentsAPI'

export default function StudentPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, paid, outstanding

  useEffect(() => {
    if (user) loadPayments()
  }, [user])

  async function loadPayments() {
    try {
      const { data, error } = await getStudentPayments(user.id)
      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      console.error('Failed to load payments', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    if (filter === 'paid') return payment.status === 'completed'
    if (filter === 'outstanding') return payment.status === 'pending' || payment.status === 'failed'
    return true
  })

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const totalOutstanding = payments
    .filter(p => p.status === 'pending' || p.status === 'failed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  if (loading) return <div>Loading payment history...</div>

  return (
    <div className="payments-container">
      <h2>Finance & Payments</h2>

      <div className="payment-summary">
        <div className="summary-card">
          <h3>Total Paid</h3>
          <p className="amount paid">£{totalPaid.toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h3>Outstanding</h3>
          <p className="amount outstanding">£{totalOutstanding.toFixed(2)}</p>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Payments
        </button>
        <button
          className={filter === 'paid' ? 'active' : ''}
          onClick={() => setFilter('paid')}
        >
          Paid
        </button>
        <button
          className={filter === 'outstanding' ? 'active' : ''}
          onClick={() => setFilter('outstanding')}
        >
          Outstanding
        </button>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="empty-state">
          <p>No payments found.</p>
        </div>
      ) : (
        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Lesson Date</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    {payment.booking?.lesson_date
                      ? new Date(payment.booking.lesson_date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>£{parseFloat(payment.amount || 0).toFixed(2)}</td>
                  <td>{payment.payment_method || 'PayPal'}</td>
                  <td>
                    <span className={`status-badge ${payment.status}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <small>{payment.paypal_transaction_id || 'N/A'}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

