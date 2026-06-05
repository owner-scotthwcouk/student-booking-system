import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function TutorPayments({ tutorId }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)

        // Attempt to join payments -> bookings to filter by tutor
        const { data, error } = await supabase
          .from('payments')
          .select('id, booking_id, student_id, amount, currency, payment_method, status, payment_date, bookings( tutor_id )')
          .eq('bookings.tutor_id', tutorId)
          .order('payment_date', { ascending: false })

        if (error) throw error
        if (mounted) setPayments(data || [])
      } catch (err) {
        console.error('Failed to load tutor payments', err)
        if (mounted) setError(err.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (tutorId) load()
    return () => (mounted = false)
  }, [tutorId])

  if (loading) return <div>Loading payments...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>

  return (
    <div>
      <h2>Payments Received</h2>
      {successMessage && <div style={{ marginBottom: '1rem', color: 'green' }}>{successMessage}</div>}
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
              <th>Actions</th>
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
                <td>
                  {p.status !== 'refunded' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const refundAmount = window.prompt(
                          `Enter refund amount in GBP for payment ${p.id}:`,
                          p.amount?.toString() || '0.00'
                        )
                        if (!refundAmount) return

                        const parsedAmount = parseFloat(refundAmount.replace(/[^0-9.]/g, ''))
                        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
                          window.alert('Please enter a valid refund amount.')
                          return
                        }

                        if (!window.confirm(`Issue a refund of £${parsedAmount.toFixed(2)} for this payment?`)) return

                        try {
                          setLoading(true)
                          setError(null)
                          setSuccessMessage('')

                          const { error: insertError } = await supabase
                            .from('payments')
                            .insert({
                              booking_id: p.booking_id,
                              student_id: p.student_id,
                              amount: parsedAmount,
                              currency: p.currency || 'GBP',
                              payment_method: 'refund',
                              status: 'refunded',
                              payment_date: new Date().toISOString(),
                              paypal_transaction_id: `REFUND-${Date.now()}`
                            })

                          if (insertError) throw insertError

                          const { data: bookingPayments, error: paymentsError } = await supabase
                            .from('payments')
                            .select('amount, status')
                            .eq('booking_id', p.booking_id)

                          if (paymentsError) throw paymentsError

                          const totalPaid = (bookingPayments || [])
                            .filter((item) => item.status === 'completed')
                            .reduce((sum, item) => sum + Number(item.amount || 0), 0)
                          const totalRefunded = (bookingPayments || [])
                            .filter((item) => item.status === 'refunded')
                            .reduce((sum, item) => sum + Number(item.amount || 0), 0)

                          if (p.booking_id && totalPaid > 0 && totalRefunded >= totalPaid) {
                            const { error: bookingError } = await supabase
                              .from('bookings')
                              .update({ payment_status: 'refunded' })
                              .eq('id', p.booking_id)
                            if (bookingError) throw bookingError
                          }

                          setSuccessMessage(`Refund of £${parsedAmount.toFixed(2)} recorded.`)
                          const { data: newData, error: reloadError } = await supabase
                            .from('payments')
                            .select('id, booking_id, student_id, amount, currency, payment_method, status, payment_date, bookings( tutor_id )')
                            .eq('bookings.tutor_id', tutorId)
                            .order('payment_date', { ascending: false })

                          if (reloadError) throw reloadError
                          setPayments(newData || [])
                        } catch (err) {
                          console.error('Failed to issue refund', err)
                          setError(err.message || 'Failed to issue refund')
                        } finally {
                          setLoading(false)
                        }
                      }}
                      style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Refund
                    </button>
                  ) : (
                    <span style={{ color: '#666' }}>Refunded</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
