import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllTutors, getTutorHourlyRate } from '../../lib/profileAPI'

export default function TutorSelection() {
  const navigate = useNavigate()
  const [tutors, setTutors] = useState([])
  const [tutorRates, setTutorRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTutors()
  }, [])

  async function loadTutors() {
    try {
      const { data, error } = await getAllTutors()
      if (error) throw error

      setTutors(data || [])

      // Load hourly rates for each tutor
      const rates = {}
      for (const tutor of data || []) {
        const { data: rateData } = await getTutorHourlyRate(tutor.id)
        rates[tutor.id] = rateData?.hourly_rate || 30.00
      }
      setTutorRates(rates)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading tutors...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div className="tutor-selection-container">
      <h2>Select Your Tutor</h2>
      <p className="description">Choose a tutor to view their availability and book a lesson.</p>

      {tutors.length === 0 ? (
        <div className="empty-state">
          <p>No tutors available at the moment.</p>
        </div>
      ) : (
        <div className="tutor-grid">
          {tutors.map((tutor) => (
            <div key={tutor.id} className="tutor-card">
              <div className="tutor-info">
                <h3>{tutor.full_name}</h3>
                <p className="tutor-email">{tutor.email}</p>
                <div className="tutor-rate">
                  <span className="rate-label">Hourly Rate:</span>
                  <span className="rate-amount">£{Number(tutorRates[tutor.id] || 30).toFixed(2)}</span>
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => navigate(`/student/book/${tutor.id}`)}
              >
                View Availability
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .tutor-selection-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .tutor-selection-container h2 {
          color: #1a1a1a;
          margin-bottom: 0.5rem;
          font-size: 2rem;
        }

        .description {
          color: #666666;
          margin-bottom: 2rem;
        }

        .tutor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .tutor-card {
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          color: #ffffff;
        }

        .tutor-card:hover {
          border-color: #7c3aed;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
          transform: translateY(-2px);
        }

        .tutor-info {
          margin-bottom: 1.5rem;
        }

        .tutor-info h3 {
          color: #1a1a1a;
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .tutor-email {
          color: #666666;
          font-size: 0.875rem;
          margin: 0 0 1rem 0;
        }

        .tutor-rate {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f0f9ff;
          border-radius: 6px;
          border: 1px solid #bfdbfe;
        }

        .rate-label {
          color: #1e40af;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .rate-amount {
          color: #1e40af;
          font-weight: bold;
          font-size: 1.25rem;
        }

        .btn-primary {
          width: 100%;
          padding: 0.875rem 1.5rem;
          background-color: #7c3aed;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary:hover {
          background-color: #6d28d9;
        }

        .loading, .error, .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666666;
        }

        .error {
          color: #dc2626;
        }
      `}</style>
    </div>
  )
}
