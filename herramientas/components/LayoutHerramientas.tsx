import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'
import { activarFaviconHerramientas } from './faviconHerramientas'

const NAV_LINKS = [
  { to: '/herramientas',               label: 'Inicio',                icon: '🏠', end: true  },
  { to: '/herramientas/areas',         label: 'Herramientas Áreas',    icon: '🗂️', end: false },
  { to: '/herramientas/personal',      label: 'Herramientas Personal', icon: '👥', end: false },
  { to: '/herramientas/reportes',      label: 'Reportes',              icon: '📊', end: false },
  { to: '/herramientas/configuracion', label: 'Configuración',         icon: '⚙️', end: false },
]

export default function LayoutHerramientas() {
  const [esCompacto,  setEsCompacto]  = useState(window.innerWidth < 1181)
  const [menuAbierto, setMenuAbierto] = useState(window.innerWidth >= 1181)
  const navigate                      = useNavigate()

  useEffect(() => {
    const anterior = document.title
    document.title = 'Herramientas | Panel'
    const restaurarFavicon = activarFaviconHerramientas()
    return () => {
      document.title = anterior
      restaurarFavicon()
    }
  }, [])

  async function cerrarSesion() {
    await supabase.auth.signOut()
    navigate('/herramientas/login', { replace: true })
  }

  useEffect(() => {
    function onResize() {
      const compact = window.innerWidth < 1181
      setEsCompacto(compact)
      if (compact) setMenuAbierto(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function alNavegar() {
    if (esCompacto) setMenuAbierto(false)
  }

  const navLinks = (
    <div style={{ flex: 1, paddingTop: '0.25rem', overflowY: 'auto' }}>

      {NAV_LINKS.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={alNavegar}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.125rem',
            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
            backgroundColor: isActive ? 'rgba(45,212,191,0.2)' : 'transparent',
            textDecoration: 'none',
            fontWeight: isActive ? '700' : '400',
            borderLeft: isActive ? '3px solid #2DD4BF' : '3px solid transparent',
            fontSize: '1rem',
            letterSpacing: '0.01em',
            transition: 'background-color 0.15s, color 0.15s',
            borderRadius: '0 8px 8px 0',
            marginRight: '0.5rem',
          })}
        >
          <span style={{ fontSize: '1.05rem', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
          {label}
        </NavLink>
      ))}

      <button
        onClick={cerrarSesion}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          width: '100%', padding: '0.75rem 1.125rem',
          color: 'rgba(255,190,190,0.8)',
          backgroundColor: 'transparent', border: 'none',
          cursor: 'pointer', fontSize: '1rem',
          borderLeft: '3px solid transparent',
          borderRadius: '0 8px 8px 0',
          marginRight: '0.5rem',
          transition: 'background-color 0.15s, color 0.15s',
          textAlign: 'left',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'
          e.currentTarget.style.color = 'rgba(255,190,190,1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'rgba(255,190,190,0.8)'
        }}
      >
        <span style={{ fontSize: '1.05rem', lineHeight: 1, flexShrink: 0 }}>↩</span>
        Cerrar sesión
      </button>

    </div>
  )

  const sidebarStyle = {
    width: '224px',
    background: 'linear-gradient(180deg, #0D9488 0%, #0F766E 60%, #115E59 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <style>{`
        .her-link:not(.her-link--active):hover {
          background: rgba(255,255,255,0.1) !important;
          color: #ffffff !important;
        }
        .her-main { box-sizing: border-box; }
        .her-main *, .her-main *::before, .her-main *::after { box-sizing: border-box; }
        .her-main img, .her-main video, .her-main svg { max-width: 100%; }
        .her-main td, .her-main th { word-break: break-word; overflow-wrap: break-word; }
        .her-main p, .her-main div, .her-main span { overflow-wrap: break-word; }
      `}</style>

      {/* Barra superior */}
      <header style={{
        background: 'linear-gradient(90deg, #0D9488 0%, #0F766E 100%)',
        padding: '0 1rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 1001,
        boxShadow: '0 2px 12px rgba(13,148,136,0.35)',
      }}>

        {/* Botón hamburguesa */}
        <button
          onClick={() => setMenuAbierto(v => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', cursor: 'pointer', padding: '0.375rem 0.5rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: '4px', flexShrink: 0, borderRadius: '8px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
        >
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'white', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'white', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'white', borderRadius: '2px' }} />
        </button>

        {/* Logo + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #2DD4BF, #0D9488)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', flexShrink: 0,
          }}>
            🔧
          </div>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.02em' }}>
            Herramientas
          </span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
            Panel
          </span>
        </div>

      </header>

      {/* Cuerpo: sidebar + contenido */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Desktop (≥ 1181px): sidebar en flujo normal */}
        {!esCompacto && menuAbierto && (
          <nav style={sidebarStyle}>
            <div style={{
              padding: '1rem 1.125rem 0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: '0.625rem',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(45,212,191,0.4), rgba(15,118,110,0.4))',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem',
              }}>
                🔧
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>
                  Panel
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Herramientas
                </div>
              </div>
            </div>
            {navLinks}
          </nav>
        )}

        {/* Mobile / Tablet (< 1181px): sidebar fijo + overlay */}
        {esCompacto && (
          <>
            <nav style={{
              ...sidebarStyle,
              position: 'fixed', top: '56px', left: 0, bottom: 0,
              zIndex: 1000,
              transform: menuAbierto ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.25s ease',
            }}>
              {navLinks}
            </nav>
            {menuAbierto && (
              <div
                onClick={() => setMenuAbierto(false)}
                style={{
                  position: 'fixed', top: '56px', left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999,
                }}
              />
            )}
          </>
        )}

        {/* Contenido de la página activa */}
        <main className="her-main" style={{ flex: 1, backgroundColor: '#F0FDFA', overflowX: 'hidden', overflowY: 'auto', minWidth: 0 }}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}
