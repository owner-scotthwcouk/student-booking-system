import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { User, Mail, Lock, Calendar, BookOpen, Loader2 } from 'lucide-react'

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

      if (signUpError) throw new Error(signUpError.message || 'Sign up failed')
      if (!user?.id) throw new Error('User creation failed')

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          date_of_birth: formData.dateOfBirth || null,
        })

      if (profileError) console.error('Profile upsert error:', profileError)

      alert('Registration successful. Please check your email to confirm your account.')
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join TutorHub as a Student or Tutor</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="input-group">
            <label>Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                type="text"
                name="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>I am a...</label>
              <div className="input-wrapper">
                <BookOpen className="input-icon" size={18} />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Date of Birth</label>
              <div className="input-wrapper">
                <Calendar className="input-icon" size={18} />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth">
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log in here</Link></p>
        </div>
      </div>
    </div>
  )
}