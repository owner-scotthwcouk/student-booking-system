import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/auth'
import { getAllStudents, getProfile, updateStudentProfile } from '../../lib/profileAPI'
import { getStudentPayments } from '../../lib/paymentsAPI'
import { getTutorBookings } from '../../lib/bookingAPI'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit2, 
  Save, 
  X, 
  Search,
  User,
  History,
  CreditCard
} from 'lucide-react'

export default function TutorStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentProfile, setStudentProfile] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: ''
  })
  const [saveLoading, setSaveLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [studentsResult, bookingsResult] = await Promise.all([
        getAllStudents(),
        getTutorBookings(user.id)
      ])

      if (studentsResult.error) throw studentsResult.error
      if (bookingsResult.error) throw bookingsResult.error

      const allStudents = studentsResult.data || []
      const allBookings = bookingsResult.data || []
      const now = new Date()

      // Process students to add booking status
      const processedStudents = allStudents.map(student => {
        const studentBookings = allBookings.filter(b => b.student_id === student.id && b.status !== 'cancelled')
        
        const hasFuture = studentBookings.some(b => {
          const dateTimeStr = `${b.lesson_date}T${b.lesson_time || '00:00'}`
          return new Date(dateTimeStr) > now
        })

        const hasPast = studentBookings.some(b => {
          const dateTimeStr = `${b.lesson_date}T${b.lesson_time || '00:00'}`
          return new Date(dateTimeStr) <= now
        })

        return {
          ...student,
          hasFuture,
          hasPast
        }
      })

      setStudents(processedStudents)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  const loadStudentDetails = useCallback(async (studentId, initialData = null) => {
    if (!studentId) return
    
    // Don't set loading to true if we have initial data (prevents flickering)
    if (!initialData) setDetailsLoading(true)
    
    setError(null)
    setIsEditing(false) 

    try {
      const [profileResult, paymentsResult] = await Promise.all([
        getProfile(studentId),
        getStudentPayments(studentId)
      ])

      // If getProfile fails but we have initialData, keep initialData
      if (profileResult.error) {
        console.warn("Could not fetch fresh profile, using list data:", profileResult.error)
      }

      // Merge fresh data with initial data to ensure no fields are lost
      const freshProfile = profileResult.data || {}
      const mergedProfile = { ...initialData, ...freshProfile }
      
      setStudentProfile(mergedProfile)
      setPayments(paymentsResult.data || [])
      
      // Update form with the most complete data we have
      setEditForm({
        full_name: mergedProfile.full_name || '',
        email: mergedProfile.email || '',
        phone_number: mergedProfile.phone_number || '',
        address: mergedProfile.address || '',
        date_of_birth: mergedProfile.date_of_birth || ''
      })

    } catch (err) {
      console.error(err)
      // Only show error if we strictly needed this data
      if (!initialData) setError(err.message || 'Failed to load student details')
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  const handleStudentSelect = (student) => {
    setSelectedStudentId(student.id)
    
    // Immediately set the profile using the data we already have from the list
    setStudentProfile(student)
    
    // Pre-fill the edit form immediately so it's never empty
    setEditForm({
      full_name: student.full_name || '',
      email: student.email || '',
      phone_number: student.phone_number || '',
      address: student.address || '',
      date_of_birth: student.date_of_birth || ''
    })

    // Then fetch the full details (payments, etc.)
    loadStudentDetails(student.id, student)
  }

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveStudent = async () => {
    setSaveLoading(true)
    setError(null)

    try {
      const { data, error } = await updateStudentProfile(selectedStudentId, editForm)
      
      if (error) throw error

      // Update local state
      setStudentProfile(data)
      
      // Update list state without full reload
      setStudents(prev => prev.map(s => 
        s.id === selectedStudentId ? { ...s, ...data } : s
      ))

      setIsEditing(false)
      alert('Student details updated successfully')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update student details')
    } finally {
      setSaveLoading(false)
    }
  }

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const totalOutstanding = payments
    .filter(p => p.status === 'pending' || p.status === 'failed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  if (loading) return <div className="loading-state">Loading students directory...</div>

  return (
    <div className="students-container">
      <div className="section-header">
        <h2>Students Directory</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="students-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Student List */}
        <div className="students-list-container">
          {students.length === 0 ? (
            <div className="empty-state">No students found.</div>
          ) : (
            <div className="students-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {students.map((student) => (
                <button
                  key={student.id}
                  className={`student-item btn-secondary ${selectedStudentId === student.id ? 'active' : ''}`}
                  onClick={() => handleStudentSelect(student)}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    width: '100%', 
                    textAlign: 'left', 
                    padding: '1rem',
                    gap: '0.5rem',
                    backgroundColor: selectedStudentId === student.id ? 'var(--primary)' : 'var(--bg-card)',
                    color: selectedStudentId === student.id ? '#fff' : 'var(--text-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <strong style={{ fontSize: '1.05rem' }}>{student.full_name}</strong>
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} /> {student.email}
                    </div>
                    {student.phone_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} /> {student.phone_number}
                      </div>
                    )}
                  </div>

                  <div className="status-tags" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    {student.hasFuture && (
                      <span className="tag-future" style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                        Active
                      </span>
                    )}
                    {student.hasPast && !student.hasFuture && (
                      <span className="tag-past" style={{ fontSize: '0.7rem', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '12px' }}>
                        Past History
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Student Details */}
        <div className="student-details">
          {!selectedStudentId ? (
            <div className="empty-state card" style={{ textAlign: 'center', padding: '3rem' }}>
              <User size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Select a student from the list to view full details and payment history.</p>
            </div>
          ) : detailsLoading && !studentProfile ? (
            <div className="card">Loading details...</div>
          ) : studentProfile ? (
            
            // MAIN DETAILS CARD - White Background, Black Text
            <div className="card" style={{ 
              textAlign: 'left', 
              backgroundColor: '#fff', 
              color: '#1e293b', 
              border: '1px solid #e2e8f0',
              padding: '2rem'
            }}>
              
              {/* Header Section */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                {isEditing ? (
                  /* EDIT FORM */
                  <div className="edit-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>Edit Student Details</h3>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#333', background: '#f1f5f9', border: '1px solid #cbd5e1' }}
                      >
                        <X size={16} /> Cancel
                      </button>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Full Name</label>
                      <input
                        type="text"
                        name="full_name"
                        value={editForm.full_name}
                        onChange={handleEditChange}
                        className="light-input"
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#000', backgroundColor: '#fff' }}
                      />
                    </div>
                    
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Email</label>
                        <input
                          type="email"
                          name="email"
                          value={editForm.email}
                          onChange={handleEditChange}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#000', backgroundColor: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Phone Number</label>
                        <input
                          type="tel"
                          name="phone_number"
                          value={editForm.phone_number}
                          onChange={handleEditChange}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#000', backgroundColor: '#fff' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Address</label>
                      <textarea
                        name="address"
                        value={editForm.address}
                        onChange={handleEditChange}
                        rows={2}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#000', backgroundColor: '#fff', resize: 'vertical' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Date of Birth</label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={editForm.date_of_birth}
                        onChange={handleEditChange}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#000', backgroundColor: '#fff' }}
                      />
                    </div>

                    <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                      <button 
                        onClick={handleSaveStudent} 
                        disabled={saveLoading}
                        className="btn-primary"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
                      >
                        {saveLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.75rem' }}>{studentProfile.full_name}</h3>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Student Profile</span>
                      </div>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#333', background: '#f1f5f9', border: '1px solid #cbd5e1' }}
                      >
                        <Edit2 size={16} /> Edit Details
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                      <div className="info-item">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>
                          <Mail size={14} /> Email
                        </label>
                        <div style={{ fontSize: '1rem', color: '#0f172a' }}>{studentProfile.email || '-'}</div>
                      </div>
                      
                      <div className="info-item">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>
                          <Phone size={14} /> Phone
                        </label>
                        <div style={{ fontSize: '1rem', color: '#0f172a' }}>{studentProfile.phone_number || '-'}</div>
                      </div>

                      <div className="info-item">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>
                          <Calendar size={14} /> Date of Birth
                        </label>
                        <div style={{ fontSize: '1rem', color: '#0f172a' }}>{studentProfile.date_of_birth || '-'}</div>
                      </div>
                      
                      <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '0.25rem' }}>
                          <MapPin size={14} /> Address
                        </label>
                        <div style={{ fontSize: '1rem', color: '#0f172a', whiteSpace: 'pre-wrap' }}>{studentProfile.address || '-'}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Financial Summary */}
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#334155' }}>
                  <CreditCard size={18} /> Financial Overview
                </h4>
                
                <div className="payment-summary" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="summary-card" style={{ flex: 1, padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h5 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Total Paid</h5>
                    <p className="amount paid" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#16a34a', margin: '0.5rem 0 0' }}>
                      £{totalPaid.toFixed(2)}
                    </p>
                  </div>
                  <div className="summary-card" style={{ flex: 1, padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h5 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Outstanding</h5>
                    <p className="amount outstanding" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#dc2626', margin: '0.5rem 0 0' }}>
                      £{totalOutstanding.toFixed(2)}
                    </p>
                  </div>
                </div>

                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#334155' }}>
                  <History size={18} /> Recent Activity
                </h4>

                {payments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
                    No payments recorded for this student.
                  </div>
                ) : (
                  <div className="payments-table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="payments-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                      <thead style={{ background: '#f1f5f9' }}>
                        <tr style={{ textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Lesson</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Amount</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment, idx) => (
                          <tr key={payment.id} style={{ borderTop: idx > 0 ? '1px solid #e2e8f0' : 'none', color: '#334155' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {payment.payment_date
                                ? new Date(payment.payment_date).toLocaleDateString()
                                : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {payment.booking?.lesson_date
                                ? new Date(payment.booking.lesson_date).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>£{parseFloat(payment.amount || 0).toFixed(2)}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span className={`status-badge ${payment.status}`} style={{ 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.8rem', 
                                fontWeight: '600',
                                textTransform: 'capitalize',
                                backgroundColor: payment.status === 'completed' ? '#dcfce7' : '#fee2e2',
                                color: payment.status === 'completed' ? '#166534' : '#991b1b'
                              }}>
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
          ) : (
            <div className="empty-state">Student details unavailable.</div>
          )}
        </div>
      </div>
    </div>
  )
}