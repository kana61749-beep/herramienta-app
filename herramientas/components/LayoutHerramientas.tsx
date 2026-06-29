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
    <div style={{ flex: 1, paddingTop: '0.5rem', overflowY: 'auto' }}>

      <div style={{ padding: '0.25rem 1rem 0.5rem', fontSize: '0.6rem', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Navegación
      </div>

      {NAV_LINKS.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={alNavegar}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            margin: '0.125rem 0.75rem',
            padding: '0.7rem 0.875rem',
            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
            backgroundColor: isActive ? 'rgba(59,169,255,0.16)' : 'transparent',
            textDecoration: 'none',
            fontWeight: isActive ? '600' : '400',
            borderLeft: isActive ? '3px solid #3BA9FF' : '3px solid transparent',
            fontSize: '0.875rem',
            letterSpacing: '0.01em',
            transition: 'all 0.15s ease',
            borderRadius: '0 10px 10px 0',
          })}
        >
          <span style={{
            width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.15rem', flexShrink: 0,
            borderRadius: '9px',
          }}>
            {icon}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}

      <div style={{ margin: '0.875rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }} />

      <div style={{ margin: '0 0.75rem' }}>
        <button
          onClick={cerrarSesion}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.7rem 0.875rem',
            color: 'rgba(255,170,170,0.75)',
            backgroundColor: 'transparent', border: 'none',
            cursor: 'pointer', fontSize: '0.875rem',
            borderLeft: '3px solid transparent',
            borderRadius: '0 10px 10px 0',
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'
            e.currentTarget.style.color = 'rgba(255,170,170,1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'rgba(255,170,170,0.75)'
          }}
        >
          <span style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', flexShrink: 0, borderRadius: '9px' }}>
            ↩
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  const sidebarStyle = {
    width: '252px',
    background: '#0D2554',
    display: 'flex',
    flexDirection: 'column' as const,
    flexShrink: 0,
    boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <style>{`
        nav a:not([aria-current="page"]):hover {
          background: rgba(255,255,255,0.06) !important;
          color: rgba(255,255,255,0.92) !important;
        }
        .her-main { box-sizing: border-box; }
        .her-main *, .her-main *::before, .her-main *::after { box-sizing: border-box; }
        .her-main img, .her-main video, .her-main svg { max-width: 100%; }
        .her-main td, .her-main th { word-break: break-word; overflow-wrap: break-word; }
        .her-main p, .her-main div, .her-main span { overflow-wrap: break-word; }
      `}</style>

      {/* ── Barra superior ── */}
      <header style={{
        background: '#FFFFFF',
        padding: '0 1.25rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 1001,
        borderBottom: '1px solid #E8EDF2',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>

        {/* Botón hamburguesa */}
        <button
          onClick={() => setMenuAbierto(v => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          style={{
            background: 'none', border: '1.5px solid #DDE3EC',
            color: '#374151', cursor: 'pointer', padding: '0.375rem 0.5rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: '4px', flexShrink: 0, borderRadius: '8px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#EFF6FF'
            e.currentTarget.style.borderColor = '#93C5FD'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.borderColor = '#DDE3EC'
          }}
        >
          <span style={{ display: 'block', width: '18px', height: '2px', backgroundColor: '#374151', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '18px', height: '2px', backgroundColor: '#374151', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '18px', height: '2px', backgroundColor: '#374151', borderRadius: '2px' }} />
        </button>

        {/* Logo + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3BA9FF, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
            boxShadow: '0 2px 10px rgba(59,169,255,0.4)',
          }}>
            🔧
          </div>
          <div>
            <div style={{ color: '#0D2554', fontWeight: '700', fontSize: '0.95rem', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Herramientas
            </div>
            <div style={{ color: '#9CA3AF', fontSize: '0.68rem', lineHeight: 1, marginTop: '0.1rem' }}>
              Panel de gestión
            </div>
          </div>
        </div>

      </header>

      {/* ── Cuerpo: sidebar + contenido ── */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Desktop (≥ 1181px): sidebar en flujo normal */}
        {!esCompacto && menuAbierto && (
          <nav style={sidebarStyle}>
            {/* Cabecera del sidebar */}
            <div style={{
              padding: '1.125rem 1.25rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
                background: 'linear-gradient(135deg, #3BA9FF, #2563EB)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.15rem',
                boxShadow: '0 3px 12px rgba(59,169,255,0.4)',
              }}>
                🔧
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Herramientas
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>
                  Panel de gestión
                </div>
              </div>
            </div>

            {navLinks}

            {/* Footer del sidebar */}
            <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: '0.04em' }}>
                v1.0 · Sistema de Herramientas
              </div>
            </div>
          </nav>
        )}

        {/* Mobile / Tablet (< 1181px): sidebar fijo + overlay */}
        {esCompacto && (
          <>
            <nav style={{
              ...sidebarStyle,
              position: 'fixed', top: '60px', left: 0, bottom: 0,
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
                  position: 'fixed', top: '60px', left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 999, backdropFilter: 'blur(2px)',
                }}
              />
            )}
          </>
        )}

        {/* Contenido de la página activa */}
        <main className="her-main" style={{ flex: 1, backgroundColor: '#F7F9FC', overflowX: 'hidden', overflowY: 'auto', minWidth: 0 }}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}
