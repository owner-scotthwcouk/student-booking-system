import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAllStudents, getProfile } from '../../lib/profileAPI'
import { getStudentPayments } from '../../lib/paymentsAPI'

export default function TutorStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentProfile, setStudentProfile] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) loadStudents()
  }, [user])

  async function loadStudents() {
    try {
      const { data, error: studentsError } = await getAllStudents()
      if (studentsError) throw studentsError
      setStudents(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  async function loadStudentDetails(studentId) {
    if (!studentId) return
    setDetailsLoading(true)
    setError(null)

    try {
      const [profileResult, paymentsResult] = await Promise.all([
        getProfile(studentId),
        getStudentPayments(studentId)
      ])

      if (profileResult.error) throw profileResult.error
      if (paymentsResult.error) throw paymentsResult.error

      setStudentProfile(profileResult.data)
      setPayments(paymentsResult.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load student details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const totalOutstanding = payments
    .filter(p => p.status === 'pending' || p.status === 'failed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  if (loading) return <div>Loading students...</div>

  return (
    <div className="students-container">
      <div className="section-header">
        <h2>Students</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="students-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div className="students-list">
          {students.length === 0 ? (
            <div className="empty-state">No students found.</div>
          ) : (
            students.map((student) => (
              <button
                key={student.id}
                className={`student-item btn-secondary ${selectedStudentId === student.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedStudentId(student.id)
                  loadStudentDetails(student.id)
                }}
                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '0.5rem' }}
              >
                <strong>{student.full_name}</strong>
                <br />
                <small>{student.email}</small>
              </button>
            ))
          )}
        </div>

        <div className="student-details">
          {!selectedStudentId ? (
            <div className="empty-state">Select a student to view details.</div>
          ) : detailsLoading ? (
            <div>Loading student details...</div>
          ) : studentProfile ? (
            <div className="card" style={{ textAlign: 'left' }}>
              <h3>Student Details</h3>
              <p><strong>Name:</strong> {studentProfile.full_name}</p>
              <p><strong>Email:</strong> {studentProfile.email}</p>
              <p><strong>Phone:</strong> {studentProfile.phone_number || 'N/A'}</p>
              <p><strong>Address:</strong> {studentProfile.address || 'N/A'}</p>
              <p><strong>Date of Birth:</strong> {studentProfile.date_of_birth || 'N/A'}</p>

              <div style={{ marginTop: '1.5rem' }}>
                <h4>Payments</h4>
                <div className="payment-summary" style={{ display: 'flex', gap: '1rem' }}>
                  <div className="summary-card">
                    <h5>Total Paid</h5>
                    <p className="amount paid">£{totalPaid.toFixed(2)}</p>
                  </div>
                  <div className="summary-card">
                    <h5>Outstanding</h5>
                    <p className="amount outstanding">£{totalOutstanding.toFixed(2)}</p>
                  </div>
                </div>

                {payments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '1rem' }}>No payments found.</div>
                ) : (
                  <div className="payments-table-container" style={{ marginTop: '1rem' }}>
                    <table className="payments-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Lesson Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Transaction ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
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
            </div>
          ) : (
            <div className="empty-state">Student details unavailable.</div>
          )}
        </div>
      </div>
    </div>
  )
}
