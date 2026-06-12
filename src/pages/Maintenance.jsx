import { MailWarning, ShieldAlert } from 'lucide-react'

export default function Maintenance() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'radial-gradient(circle at top, #1e293b 0%, #020617 70%)',
        color: '#f8fafc'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          padding: '2.5rem',
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
          textAlign: 'center',
          backdropFilter: 'blur(16px)'
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 1.25rem',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(239, 68, 68, 0.14)',
            color: '#fca5a5'
          }}
        >
          <ShieldAlert size={34} />
        </div>

        <h1 style={{ margin: 0, fontSize: '2.25rem', letterSpacing: '-0.03em' }}>
          Maintenance Mode
        </h1>
        <p style={{ margin: '1rem 0 0', fontSize: '1.05rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          The site is currently undergoing maintenance. Student access is temporarily unavailable.
          Please try again later.
        </p>

        <div
          style={{
            marginTop: '1.75rem',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <MailWarning size={18} />
          <span>
            Questions? Email{' '}
            <a href="mailto:scott@scott-hw.online" style={{ color: '#7dd3fc', textDecoration: 'none' }}>
              scott@scott-hw.online
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}
