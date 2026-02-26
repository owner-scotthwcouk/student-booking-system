import { useState } from 'react'

export default function BrandLogo({
  size = 44,
  showWordmark = true,
  wordmarkSize = 24,
  imageSrc = null
}) {
  const [showFallbackMark, setShowFallbackMark] = useState(!imageSrc)

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.7rem' }}>
      <div
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1px solid rgba(124, 216, 232, 0.35)',
          background: 'linear-gradient(145deg, rgba(76, 224, 233, 0.2), rgba(149, 91, 233, 0.22))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {imageSrc && !showFallbackMark && (
          <img
            src={imageSrc}
            alt="Edumaxim logo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setShowFallbackMark(true)}
          />
        )}
        <span
          style={{
            display: showFallbackMark ? 'inline-block' : 'none',
            position: 'absolute',
            fontSize: `${Math.max(14, Math.round(size * 0.38))}px`,
            fontWeight: 800,
            color: '#4ce0e9',
            letterSpacing: '0.02em'
          }}
        >
          EM
        </span>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: `${Math.max(3, Math.round(size * 0.14))}px`,
            right: `${Math.max(3, Math.round(size * 0.14))}px`,
            width: `${Math.max(5, Math.round(size * 0.16))}px`,
            height: `${Math.max(5, Math.round(size * 0.16))}px`,
            borderRadius: '50%',
            background: '#4ce0e9',
            boxShadow: '0 0 0 2px rgba(15, 23, 42, 0.45)'
          }}
        />
      </div>
      {showWordmark && (
        <span
          style={{
            fontSize: `${wordmarkSize}px`,
            fontWeight: 800,
            letterSpacing: '0.03em',
            lineHeight: 1,
            background: 'linear-gradient(90deg, #4ce0e9 0%, #8a72f8 58%, #b45bdd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          EDUMAXIM
        </span>
      )}
    </div>
  )
}
