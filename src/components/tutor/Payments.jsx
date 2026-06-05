import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function TutorPayments({ tutorId }) {
  const [payments, setPayments] = useState([])
  const [studentProfiles, setStudentProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [refundLoading, setRefundLoading] = useState(false)
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
        const paymentsData = data || []
        if (mounted) setPayments(paymentsData)

        const studentIds = [...new Set(paymentsData.map((item) => item.student_id).filter(Boolean))]
        if (studentIds.length) {
          const { data: students, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds)

          if (profileError) throw profileError

          if (mounted) {
            const profileMap = (students || []).reduce((acc, student) => {
              acc[student.id] = student
              return acc
            }, {})
            setStudentProfiles(profileMap)
          }
        }
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

  const studentSummaries = Object.entries(studentProfiles).map(([studentId, profile]) => {
    const studentPayments = payments.filter((payment) => payment.student_id === studentId)
    const totalPaid = studentPayments
      .filter((payment) => payment.status === 'completed')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const totalRefunded = studentPayments
      .filter((payment) => payment.status === 'refunded')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

    return {
      studentId,
      profile,
      studentPayments,
      totalPaid,
      totalRefunded
    }
  })

  const formatCsv = (value) => {
    if (value == null) return ''
    const stringValue = String(value)
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const downloadStatement = (studentId) => {
    const student = studentProfiles[studentId]
    const rows = payments
      .filter((payment) => payment.student_id === studentId)
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))

    if (!rows.length) return

    const header = ['Payment ID', 'Booking ID', 'Date', 'Amount', 'Currency', 'Method', 'Status']
    const body = rows.map((payment) => [
      payment.id,
      payment.booking_id,
      payment.payment_date ? new Date(payment.payment_date).toISOString() : '',
      payment.amount,
      payment.currency,
      payment.payment_method,
      payment.status
    ])

    const totalPaid = rows
      .filter((p) => p.status === 'completed')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const totalRefunded = rows
      .filter((p) => p.status === 'refunded')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const net = totalPaid - totalRefunded

    const csvLines = [header.join(','), ...body.map((row) => row.map(formatCsv).join(','))]
    csvLines.push('')
    csvLines.push(`Total Paid:,${formatCsv(totalPaid.toFixed(2))}`)
    csvLines.push(`Total Refunded:,${formatCsv(totalRefunded.toFixed(2))}`)
    csvLines.push(`Net Amount:,${formatCsv(net.toFixed(2))}`)

    const csvString = csvLines.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const studentName = student?.full_name?.replace(/[^a-zA-Z0-9_-]/g, '_') || studentId
    link.setAttribute('download', `statement_${studentName}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) return <div>Loading payments...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>

  return (
    <div>
      <h2>Payments Received</h2>
      {successMessage && <div style={{ marginBottom: '1rem', color: 'green' }}>{successMessage}</div>}
      {studentSummaries.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3>Student Statements</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {studentSummaries.map((summary) => (
              <div
                key={summary.studentId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: '#fafafa'
                }}
              >
                <div>
                  <strong>{summary.profile.full_name || 'Unknown Student'}</strong>
                  <div style={{ fontSize: '0.9rem', color: '#555' }}>
                    Paid: £{summary.totalPaid.toFixed(2)} · Refunded: £{summary.totalRefunded.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={refundLoading}
                  onClick={() => downloadStatement(summary.studentId)}
                  style={{ padding: '0.5rem 0.9rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Download statement
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {payments.length === 0 ? (
        <p>No payments found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Booking ID</th>
              <th>Student</th>
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
                <td>{studentProfiles[p.student_id]?.full_name || 'Unknown student'}</td>
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
