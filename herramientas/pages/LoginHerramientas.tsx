import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'
import { activarFaviconHerramientas } from '../components/faviconHerramientas'

export default function LoginHerramientas() {
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const anterior = document.title
    document.title = 'Herramientas | Acceso'
    const restaurarFavicon = activarFaviconHerramientas()
    return () => {
      document.title = anterior
      restaurarFavicon()
    }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/herramientas', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  async function loginConGoogle() {
    setCargando(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://myproyecto-3fba.vercel.app/admin/auth?from=herramientas' },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F0FDFA',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <style>{`@keyframes aparecer { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{
        backgroundColor: 'white', border: '1px solid #99F6E4', borderRadius: '20px',
        padding: '2.5rem 2rem', width: '100%', maxWidth: '360px',
        boxShadow: '0 4px 24px rgba(13,148,136,0.1)', textAlign: 'center',
        animation: 'aparecer 0.3s ease',
      }}>

        <div style={{
          width: '68px', height: '68px', backgroundColor: '#0D9488', borderRadius: '16px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.25rem', boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
        }}>
          <span style={{ fontSize: '1.9rem', lineHeight: 1 }}>🔧</span>
        </div>

        <h1 style={{ color: '#0D9488', fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.3rem' }}>
          Herramientas
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
          Panel de control · Acceso restringido
        </p>

        <button
          onClick={loginConGoogle}
          disabled={cargando}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            width: '100%', padding: '0.875rem 1rem',
            backgroundColor: 'white', border: '1.5px solid #e5e7eb', borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: '600', color: '#374151',
            cursor: cargando ? 'wait' : 'pointer',
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            transition: 'box-shadow 0.15s, border-color 0.15s',
            opacity: cargando ? 0.65 : 1,
          }}
          onMouseEnter={e => {
            if (!cargando) {
              e.currentTarget.style.borderColor = '#0D9488'
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(13,148,136,0.14)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#e5e7eb'
            e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.07)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          {cargando ? 'Redirigiendo...' : 'Continuar con Google'}
        </button>

        <p style={{ color: '#d1d5db', fontSize: '0.75rem', marginTop: '1.75rem', lineHeight: 1.5 }}>
          Solo personal autorizado puede acceder.
        </p>
      </div>
    </div>
  )
}
