// src/components/auth/Register.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/auth'
export default function Register() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student',
    dateOfBirth: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { user, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
            date_of_birth: formData.dateOfBirth || null,
          },
        },
      })

      if (signUpError) {
        throw new Error(signUpError.message || 'Sign up failed')
      }

      if (!user?.id) {
        throw new Error('User creation failed')
      }

      // Create profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          date_of_birth: formData.dateOfBirth || null,
        })

      if (profileError) {
        console.error('Profile upsert error:', profileError)
      }

      alert('Registration successful. Please check your email to confirm your account.')
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <div className="card">
        <h2>Create an Account</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Join TutorHub
        </p>

        {error && (
          <div className="error" style={{ color: 'red', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>I am a...</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label>Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
