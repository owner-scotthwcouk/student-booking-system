I have updated the **Home** screen (`src/components/Home.jsx`) to display **Edumaxim** in the navigation header and the footer, replacing the previous "TutorBooking" branding.

### `src/components/Home.jsx`

```jsx
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth'
import { useEffect } from 'react'

export default function Home() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  useEffect(() => {
    // Auto-redirect if logged in
    if (user && profile) {
      navigate(profile.role === 'tutor' ? '/tutor' : '/student')
    }
  }, [user, profile, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header/Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 3rem',
        borderBottom: '2px solid #3a3a3a'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          color: '#7c3aed',
          fontWeight: 'bold'
        }}>
          Edumaxim
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#e5e5e5',
              border: '2px solid #3a3a3a',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#7c3aed'
              e.target.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#3a3a3a'
              e.target.style.color = '#e5e5e5'
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#6d28d9'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#7c3aed'}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Book Your Perfect Tutor
        </h1>
        <p style={{
          fontSize: '1.5rem',
          color: '#a0a0a0',
          maxWidth: '700px',
          marginBottom: '3rem',
          lineHeight: '1.8'
        }}>
          Connect with expert tutors, schedule lessons at your convenience, and pay securely online.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '1.25rem 3rem',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.25rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#6d28d9'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#7c3aed'
              e.target.style.transform = 'translateY(0)'
            }}
          >
            Get Started as Student
          </button>
        </div>

        {/* Features */}
        <div style={{
          marginTop: '6rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          width: '100%'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #3a3a3a',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3a3a3a'}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Customised Learning Journey</h3>
            <p style={{ color: '#a0a0a0' }}>Personalised lessons tailored to your pace, style, and learning goals</p>
          </div>

          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #3a3a3a',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3a3a3a'}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Easy Scheduling</h3>
            <p style={{ color: '#a0a0a0' }}>Book lessons at times that work for you</p>
          </div>

          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #3a3a3a',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3a3a3a'}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Secure Payments</h3>
            <p style={{ color: '#a0a0a0' }}>Pay safely with Stripe-powered checkout</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '2rem 3rem',
        borderTop: '2px solid #3a3a3a',
        textAlign: 'center',
        color: '#a0a0a0'
      }}>
        <p>© 2026 Edumaxim. All rights reserved.</p>
      </footer>
    </div>
  )
}

```
