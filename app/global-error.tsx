'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="it">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '1rem',
          fontFamily: 'sans-serif',
        }}
      >
        <a
          href="/dashboard"
          style={{ fontSize: '1.5rem', fontWeight: 700, textDecoration: 'none', marginBottom: '2rem' }}
        >
          carDoc
        </a>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
          Qualcosa è andato storto
        </h2>
        <p style={{ marginTop: '0.5rem', color: '#6b7280', maxWidth: '24rem' }}>
          Si è verificato un errore imprevisto.
        </p>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Riprova
          </button>
          <a
            href="/dashboard"
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: '#000',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Torna alla dashboard
          </a>
        </div>
      </body>
    </html>
  )
}
