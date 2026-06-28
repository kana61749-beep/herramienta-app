import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'

export default function AuthCallbackHerramientas() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    let vivo = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && vivo) {
        navigate('/herramientas', { replace: true })
      }
    })

    async function handleAuth() {
      const searchParams = new URLSearchParams(window.location.search)
      const hashParams   = new URLSearchParams(window.location.hash.slice(1))

      const supaError = searchParams.get('error') ?? hashParams.get('error')
      if (supaError) {
        console.error('[Auth] Error OAuth:', supaError, searchParams.get('error_description'))
        if (vivo) setError(true)
        return
      }

      const code        = searchParams.get('code')
      const accessToken = hashParams.get('access_token')

      const { data: { session } } = await supabase.auth.getSession()
      if (session) { navigate('/herramientas', { replace: true }); return }

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('[Auth] exchangeCodeForSession error:', exchangeError.message)
          if (vivo) setError(true)
          return
        }
        if (data?.session) { navigate('/herramientas', { replace: true }); return }
      }

      if (!accessToken) {
        console.warn('[Auth] Sin tokens en URL')
        if (vivo) setError(true)
      }
    }

    handleAuth()
    return () => { vivo = false; subscription.unsubscribe() }
  }, [navigate])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#F0FDFA',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center',
      }}>
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <p style={{ color: '#ef4444', fontWeight: '600', margin: 0, fontSize: '0.95rem' }}>
          No se pudo iniciar sesión
        </p>
        <button
          onClick={() => navigate('/herramientas/login', { replace: true })}
          style={{
            marginTop: '0.5rem', padding: '0.65rem 1.5rem',
            backgroundColor: '#0D9488', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          Volver al login
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F0FDFA',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1rem',
    }}>
      <style>{`@keyframes giro { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        border: '4px solid #99F6E4', borderTopColor: '#0D9488',
        animation: 'giro 0.85s linear infinite',
      }} />
      <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
        Validando acceso...
      </p>
    </div>
  )
}
