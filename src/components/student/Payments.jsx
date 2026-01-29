import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/auth'
import { supabase } from '../../lib/supabaseClient'

export default function StudentPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('payments')
          .select('id, booking_id, amount, currency, payment_method, status, payment_date')
          .eq('student_id', user?.id)
          .order('payment_date', { ascending: false })

        if (error) throw error
        if (mounted) setPayments(data || [])
      } catch (err) {
        console.error('Failed to load payments', err)
        if (mounted) setError(err.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (user?.id) load()
    return () => (mounted = false)
  }, [user?.id])

  if (loading) return <div>Loading payments...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>

  return (
    <div>
      <h2>Payments</h2>
      {payments.length === 0 ? (
        <p>No payments found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Booking</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.booking_id}</td>
                <td>
                  {p.currency} {p.amount}
                </td>
                <td>{p.payment_method}</td>
                <td>{p.status}</td>
                <td>{new Date(p.payment_date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/auth'
import { getStudentPayments } from '../../lib/paymentsAPI'

export default function StudentPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, paid, outstanding

  const loadPayments = useCallback(async () => {
    try {
      const { data, error } = await getStudentPayments(user.id)
      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      console.error('Failed to load payments', err)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    if (user) {
      loadPayments()
    }
  }, [user, loadPayments])

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
                  <td>{payment.payment_method === 'stripe' ? 'Stripe Card' : payment.payment_method || 'Unknown'}</td>
                  <td>
                    <span className={`status-badge ${payment.status}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <small>{payment.stripe_payment_intent_id || 'N/A'}</small>
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

