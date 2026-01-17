import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Login successful - redirect to dashboard
      navigate('/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div className="card">
        <h2>Welcome Back</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Please sign in to continue
        </p>

        {error && <div className="error" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9em' }}>
          <p>
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}