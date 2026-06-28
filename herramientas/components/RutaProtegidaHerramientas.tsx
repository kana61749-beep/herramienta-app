import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'

// ── BYPASS TEMPORAL ────────────────────────────────────────────────────────────
// Cambiar a `false` para reactivar el login con Google en /herramientas/*
// No afecta a EvalQR ni a /admin/* en absoluto.
const BYPASS_LOGIN = true
// ──────────────────────────────────────────────────────────────────────────────

// Componente exportado: si el bypass está activo pasa directo al panel.
// Si no, delega en la lógica de autenticación completa.
export default function RutaProtegidaHerramientas() {
  if (BYPASS_LOGIN) return <Outlet />
  return <AuthGuard />
}

// ── Lógica de auth — intacta, se reactiva cambiando BYPASS_LOGIN a false ──────
type Estado = 'verificando' | 'autorizado' | 'sin_sesion'

function AuthGuard() {
  const [estado, setEstado] = useState<Estado>('verificando')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) setEstado('autorizado')
      } else if (event === 'SIGNED_OUT') {
        setEstado('sin_sesion')
      }
    })

    // Verificación inicial: si ya hay sesión activa (refresh de página)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setEstado('autorizado')
      } else {
        setTimeout(() => {
          setEstado(prev => prev === 'verificando' ? 'sin_sesion' : prev)
        }, 1500)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (estado === 'verificando') {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#F0FDFA',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{`@keyframes giro { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '4px solid #99F6E4', borderTopColor: '#0D9488',
          animation: 'giro 0.85s linear infinite',
        }} />
      </div>
    )
  }

  if (estado === 'sin_sesion') {
    return <Navigate to="/herramientas/login" replace />
  }

  return <Outlet />
}
