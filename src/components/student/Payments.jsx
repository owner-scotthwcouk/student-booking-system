import { useEffect, useState, useCallback } from 'react'
import { getStudentPayments } from '../../lib/paymentsAPI'
import { CreditCard, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function StudentPayments({ studentId }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState(null)

  const loadPayments = useCallback(async () => {
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
  }, [studentId])

  useEffect(() => {
    if (studentId) {
      loadPayments()
    }
  }, [studentId, loadPayments])

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const openCustomerPortal = async () => {
    try {
      setPortalLoading(true)
      setPortalError(null)

      const { data, error: portalErrorResponse } = await supabase.functions.invoke(
        'stripe-portal',
        { body: {} },
      )

      if (portalErrorResponse) {
        throw new Error(portalErrorResponse.message || 'Failed to open Stripe customer portal')
      }

      if (!data?.portal_url) {
        throw new Error('Stripe customer portal URL was not returned')
      }

      window.open(data.portal_url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setPortalError(err.message || 'Failed to open Stripe customer portal')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="payments-container">
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
        <div style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={openCustomerPortal}
            disabled={portalLoading}
            className="btn-primary"
            style={{ minWidth: '220px' }}
          >
            {portalLoading ? 'Opening portal...' : 'Manage billing in Stripe'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Payment History</h3>
        {portalError && <div className="error-message"><AlertCircle size={16} /> {portalError}</div>}
        {error && <div className="error-message"><AlertCircle size={16} /> {error}</div>}

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
