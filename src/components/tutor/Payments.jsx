import { useEffect, useState } from 'react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { format, endOfDay, parseISO, isValid } from 'date-fns'
import { supabase } from '../../lib/supabaseClient'
import statementTemplateImage from '../../../assets/statement-template.png'

export default function TutorPayments({ tutorId }) {
  const [payments, setPayments] = useState([])
  const [studentProfiles, setStudentProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [refundLoading, setRefundLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

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

  const getStatementRange = () => {
    const from = parseISO(customFrom)
    const to = parseISO(customTo)
    if (isValid(from) && isValid(to)) {
      return [from, endOfDay(to)]
    }
    return [null, null]
  }

  const getStatementLabel = () => {
    const [start, end] = getStatementRange()
    if (!start || !end) return 'Custom range'
    return `${format(start, 'dd MMM yyyy')} – ${format(end, 'dd MMM yyyy')}`
  }

  const downloadStatement = async (studentId) => {
    const student = studentProfiles[studentId]
    const [start, end] = getStatementRange()
    const from = parseISO(customFrom)
    const to = parseISO(customTo)
    if (!customFrom || !customTo || !isValid(from) || !isValid(to)) {
      window.alert('Please select a valid custom start and end date for the statement.')
      return
    }
    if (from > to) {
      window.alert('The custom end date must be the same as or after the start date.')
      return
    }

    const rows = payments
      .filter((payment) => payment.student_id === studentId)
      .filter((payment) => {
        if (!payment.payment_date || !start || !end) return true
        const paymentDate = parseISO(payment.payment_date)
        return isValid(paymentDate) && paymentDate >= start && paymentDate <= end
      })
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))

    if (!rows.length) {
      window.alert('No payments found for this selected range.')
      return
    }

    const studentName = student?.full_name?.replace(/[^a-zA-Z0-9_-]/g, '_') || studentId
    const templateResponse = await fetch(statementTemplateImage)
    if (!templateResponse.ok) {
      window.alert('Unable to load statement template.')
      return
    }
    const templateBytes = await templateResponse.arrayBuffer()
    const pdfDoc = await PDFDocument.create()
    const templateImage = await pdfDoc.embedPng(templateBytes)
    const imageWidth = templateImage.width
    const imageHeight = templateImage.height
    let currentPage = pdfDoc.addPage([imageWidth, imageHeight])
    currentPage.drawImage(templateImage, {
      x: 0,
      y: 0,
      width: imageWidth,
      height: imageHeight
    })
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const headerFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const pageWidth = currentPage.getWidth()
    const pageHeight = currentPage.getHeight()
    let cursorY = pageHeight - 90

    const drawText = (text, x, y, options = {}) => {
      currentPage.drawText(text, {
        x,
        y,
        size: options.size || 10,
        font: options.font || font,
        color: options.color || rgb(0, 0, 0)
      })
    }

    drawText(`Statement for ${student?.full_name || 'Student'}`, 50, cursorY, { size: 18, font: headerFont })
    cursorY -= 26
    drawText(`Period: ${getStatementLabel()}`, 50, cursorY, { size: 11, font: font })
    cursorY -= 16
    drawText(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 50, cursorY, { size: 11, font: font })
    cursorY -= 24
    drawText(`Statement for: ${student?.full_name || 'Student'}`, 50, cursorY, { size: 11, font: font })
    cursorY -= 20
    drawText(`Statement period: ${getStatementLabel()}`, 50, cursorY, { size: 11, font: font })
    cursorY -= 24

    const columnX = [50, 170, 300, 380, 430, 500, 560]
    const header = ['Payment ID', 'Booking ID', 'Date', 'Amount', 'Currency', 'Method', 'Status']
    header.forEach((text, index) => {
      drawText(text, columnX[index], cursorY, { size: 10, font: headerFont })
    })
    cursorY -= 16

    for (const payment of rows) {
      if (cursorY < 90) {
        currentPage = pdfDoc.addPage([imageWidth, imageHeight])
        currentPage.drawImage(templateImage, {
          x: 0,
          y: 0,
          width: imageWidth,
          height: imageHeight
        })
        cursorY = pageHeight - 90
      }
      const dateString = payment.payment_date ? format(parseISO(payment.payment_date), 'dd MMM yyyy') : ''
      const line = [payment.id || '', payment.booking_id || '', dateString, `${payment.amount || ''}`, payment.currency || '', payment.payment_method || '', payment.status || '']
      line.forEach((text, index) => {
        drawText(String(text), columnX[index], cursorY, { size: 10 })
      })
      cursorY -= 16
    }

    cursorY -= 20
    const totalPaid = rows
      .filter((p) => p.status === 'completed')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const totalRefunded = rows
      .filter((p) => p.status === 'refunded')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const net = totalPaid - totalRefunded

    if (cursorY < 90) {
      currentPage = pdfDoc.addPage([imageWidth, imageHeight])
      currentPage.drawImage(templateImage, {
        x: 0,
        y: 0,
        width: imageWidth,
        height: imageHeight
      })
      cursorY = pageHeight - 90
    }

    drawText('Total Paid:', 50, cursorY, { size: 11, font: headerFont })
    drawText(`£${totalPaid.toFixed(2)}`, 180, cursorY, { size: 11 })
    cursorY -= 16
    drawText('Total Refunded:', 50, cursorY, { size: 11, font: headerFont })
    drawText(`£${totalRefunded.toFixed(2)}`, 180, cursorY, { size: 11 })
    cursorY -= 16
    drawText('Net Amount:', 50, cursorY, { size: 11, font: headerFont })
    drawText(`£${net.toFixed(2)}`, 180, cursorY, { size: 11 })

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement_${studentName}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
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
          <div style={{ margin: '1rem 0 1.5rem', padding: '1rem', borderRadius: '16px', background: '#111827', color: '#f8fafc', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <div style={{ minWidth: '220px' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', color: '#cbd5e1', fontWeight: 600 }}>Statement Start</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc' }}
                />
              </div>
              <div style={{ minWidth: '220px' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', color: '#cbd5e1', fontWeight: 600 }}>Statement End</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc' }}
                />
              </div>
              <div style={{ width: '100%', color: '#e2e8f0', fontSize: '0.9rem', marginTop: '0.75rem', padding: '0.85rem 1rem', borderRadius: '10px', background: '#1f2937', border: '1px solid #334155' }}>
                Select a start and end date to generate a student statement PDF for that period.
              </div>
            </div>
            {(!customFrom || !customTo) && (
              <div style={{ marginTop: '1rem', color: '#fee2e2', background: '#4b5563', padding: '0.9rem 1rem', borderRadius: '10px' }}>
                Please choose both a start and end date to download a statement range.
              </div>
            )}
            <div style={{ marginTop: '1rem', color: '#9ca3af' }}>Current selection: {getStatementLabel()}</div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {studentSummaries.map((summary) => (
              <div
                key={summary.studentId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: '12px',
                  background: '#111827',
                  color: '#f8fafc'
                }}
              >
                <div>
                  <strong style={{ fontSize: '1rem' }}>{summary.profile.full_name || 'Unknown Student'}</strong>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                    Paid: £{summary.totalPaid.toFixed(2)} · Refunded: £{summary.totalRefunded.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={refundLoading}
                  onClick={() => downloadStatement(summary.studentId)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    cursor: refundLoading ? 'not-allowed' : 'pointer',
                    border: 'none',
                    background: '#7c3aed',
                    color: '#fff',
                    fontWeight: 600
                  }}
                >
                  Download PDF
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
