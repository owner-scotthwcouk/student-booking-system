import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student', // Default role
    dateOfBirth: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Option 2: Sign up with metadata
      // (The SQL Trigger 'on_auth_user_created' will handle the profile creation)
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
            date_of_birth: formData.dateOfBirth
          }
        }
      })

      if (error) throw error
      
      // Check if session exists (if email confirmation is on, it might be null)
      if (data?.user) {
        alert('Registration successful! Please log in.')
        navigate('/login')
      }

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <div className="card">
        <h2>Create an Account</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Join the Student Booking System
        </p>

        {error && <div className="error" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>I am a...</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="John Doe"
              style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Min. 6 characters"
              minLength={6}
              style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9em' }}>
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}