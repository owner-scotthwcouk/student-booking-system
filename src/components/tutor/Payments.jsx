import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { format, endOfDay, parseISO, isValid } from 'date-fns'
import { supabase } from '../../lib/supabaseClient'

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
    const templateResponse = await fetch('/Statement-template.docx')
    if (!templateResponse.ok) {
      window.alert('Unable to load statement template.')
      return
    }
    const templateBytes = await templateResponse.arrayBuffer()
    const zip = await JSZip.loadAsync(templateBytes)
    const docXmlFile = zip.file('word/document.xml')
    if (!docXmlFile) {
      window.alert('Statement template is not a valid DOCX file.')
      return
    }
    const parser = new DOMParser()
    const serializer = new XMLSerializer()
    const documentXml = await docXmlFile.async('text')
    const xmlDoc = parser.parseFromString(documentXml, 'application/xml')

    const getTextNodes = (element) => {
      const nodes = Array.from(element.getElementsByTagName('w:t'))
      if (nodes.length) return nodes
      return Array.from(element.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't'))
    }

    const replacePlaceholdersInElement = (element, values) => {
      const textNodes = getTextNodes(element)
      if (!textNodes.length) return
      const positions = []
      textNodes.forEach((node) => {
        const text = node.textContent || ''
        for (let offset = 0; offset < text.length; offset += 1) {
          positions.push({ node, offset })
        }
      })

      const fullText = positions.map((pos) => pos.node.textContent?.[pos.offset] || '').join('')
      const placeholderRegex = /{{\s*([^}]+?)\s*}}/g
      const replacements = []
      let match
      while ((match = placeholderRegex.exec(fullText)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          key: match[1].trim(),
          value: values[match[1].trim()] ?? ''
        })
      }

      for (let i = replacements.length - 1; i >= 0; i -= 1) {
        const { start, end, value } = replacements[i]
        const startPos = positions[start]
        const endPos = positions[end - 1]
        if (!startPos || !endPos) continue

        const firstNode = startPos.node
        const lastNode = endPos.node
        const firstText = firstNode.textContent || ''
        const lastText = lastNode.textContent || ''
        const prefix = firstText.slice(0, startPos.offset)
        const suffix = lastText.slice(endPos.offset + 1)
        firstNode.textContent = `${prefix}${value}${suffix}`

        if (firstNode !== lastNode) {
          let clearing = false
          for (const node of textNodes) {
            if (node === firstNode) {
              clearing = true
              continue
            }
            if (node === lastNode) {
              node.textContent = ''
              break
            }
            if (clearing) {
              node.textContent = ''
            }
          }
        }
      }
    }

    const templateRow = Array.from(xmlDoc.getElementsByTagName('w:tr')).find((row) => row.textContent?.includes('{{'))
    if (templateRow) {
      const table = templateRow.parentNode
      const rowTemplate = templateRow.cloneNode(true)
      for (const payment of rows) {
        const clonedRow = rowTemplate.cloneNode(true)
        replacePlaceholdersInElement(clonedRow, {
          'Booking ID': payment.booking_id || '',
          'Payment ID': payment.id || '',
          'Cash or Stripe': payment.payment_method || '',
          Ststus: payment.status || '',
          amount: Number(payment.amount || 0).toFixed(2),
          'Date/Time completed': payment.payment_date ? format(parseISO(payment.payment_date), 'dd MMM yyyy HH:mm') : ''
        })
        table.insertBefore(clonedRow, templateRow)
      }
      table.removeChild(templateRow)
    }

    replacePlaceholdersInElement(xmlDoc.documentElement, {
      StudentName: student?.full_name || '',
      'Todays Date': format(new Date(), 'dd MMM yyyy'),
      'This is where the date that the tutor has searched from': start ? format(start, 'dd MMM yyyy') : '',
      'This is where the date that the tutor has searched to': end ? format(end, 'dd MMM yyyy') : ''
    })

    const updatedXml = serializer.serializeToString(xmlDoc)
    zip.file('word/document.xml', updatedXml)

    const docxBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(docxBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement_${studentName}.docx`
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
                Select a start and end date to generate a student statement DOCX for that period.
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
                  Download Statement
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
