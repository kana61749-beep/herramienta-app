import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'
import { activarFaviconHerramientas } from './faviconHerramientas'

const NAV_LINKS = [
  { to: '/herramientas',          label: 'Inicio',                icon: '🏠', end: true  },
  { to: '/herramientas/areas',    label: 'Herramientas Áreas',    icon: '🗂️', end: false },
  { to: '/herramientas/personal', label: 'Herramientas Personal', icon: '👥', end: false },
  { to: '/herramientas/reportes', label: 'Reportes',              icon: '📊', end: false },
]

export default function LayoutHerramientas() {
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function alClicarFuera(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', alClicarFuera)
    return () => document.removeEventListener('mousedown', alClicarFuera)
  }, [])

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <style>{`
        /* ─── Layout helpers ─── */
        .her-main { box-sizing: border-box; }
        .her-main *, .her-main *::before, .her-main *::after { box-sizing: border-box; }
        .her-main img, .her-main video, .her-main svg { max-width: 100%; }
        .her-main td, .her-main th { word-break: break-word; overflow-wrap: break-word; }
        .her-main p, .her-main div, .her-main span { overflow-wrap: break-word; }

        /* ─── Bottom navigation items ─── */
        .her-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1;
          padding: 6px 4px 10px;
          text-decoration: none;
          color: #9CA3AF;
          position: relative;
          transition: color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .her-nav-item:hover { color: #2563EB; }
        .her-nav-item:hover .her-nav-icon { opacity: 1; }

        .her-nav-item[aria-current="page"] { color: #2563EB; }

        /* indicator line at top */
        .her-nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 3px;
          border-radius: 0 0 4px 4px;
          background: transparent;
          transition: background 0.15s ease;
        }
        .her-nav-item[aria-current="page"]::before { background: #2563EB; }

        /* icon wrapper */
        .her-nav-icon {
          font-size: 1.45rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 30px;
          border-radius: 15px;
          transition: all 0.15s ease;
          opacity: 0.45;
        }

        .her-nav-item[aria-current="page"] .her-nav-icon {
          opacity: 1;
          background: #EFF6FF;
        }

        /* label */
        .her-nav-label {
          font-size: 0.615rem;
          font-weight: 500;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
          transition: font-weight 0.15s;
        }
        .her-nav-item[aria-current="page"] .her-nav-label { font-weight: 700; }

        /* three-dot menu button */
        .her-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #123C7A;
          font-size: 1.4rem;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .her-menu-btn:hover { background: #EFF6FF; }

        /* dropdown menu */
        .her-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 190px;
          background: #FFFFFF;
          border: 1px solid #E8EDF2;
          border-radius: 12px;
          box-shadow: 0 8px 28px rgba(13,37,84,0.14);
          overflow: hidden;
          z-index: 1002;
        }

        .her-menu-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          padding: 0.7rem 0.9rem;
          background: none;
          border: none;
          color: #123C7A;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }
        .her-menu-item:hover { background: #F7F9FC; }
        .her-menu-item.her-menu-item--danger { color: #DC2626; }
        .her-menu-item.her-menu-item--danger:hover { background: #FEF2F2; }
      `}</style>

      {/* ── Barra superior ── */}
      <header style={{
        background: '#FFFFFF',
        padding: '0 1rem',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 1001,
        borderBottom: '1px solid #E8EDF2',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>

        {/* Logo */}
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #3BA9FF, #2563EB)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.95rem', flexShrink: 0,
          boxShadow: '0 2px 8px rgba(59,169,255,0.35)',
        }}>
          🔧
        </div>

        {/* Título */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#0D2554', fontWeight: '700', fontSize: '0.9rem', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            Herramientas
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '0.65rem', lineHeight: 1, marginTop: '0.1rem' }}>
            Panel de gestión
          </div>
        </div>

        {/* Menú de opciones — lado derecho del header */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            className="her-menu-btn"
            onClick={() => setMenuAbierto(v => !v)}
            aria-label="Más opciones"
            aria-haspopup="true"
            aria-expanded={menuAbierto}
          >
            ⋮
          </button>

          {menuAbierto && (
            <div className="her-menu-dropdown">
              <NavLink
                to="/herramientas/configuracion"
                className="her-menu-item"
                onClick={() => setMenuAbierto(false)}
              >
                <span>⚙️</span>
                <span>Configuración</span>
              </NavLink>
              <button
                className="her-menu-item her-menu-item--danger"
                onClick={() => { setMenuAbierto(false); cerrarSesion() }}
              >
                <span>↩</span>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>

      </header>

      {/* ── Contenido principal ── */}
      <main
        className="her-main"
        style={{
          flex: 1,
          backgroundColor: '#F7F9FC',
          overflowX: 'hidden',
          overflowY: 'auto',
          minWidth: 0,
          paddingBottom: '72px',
        }}
      >
        <Outlet />
      </main>

      {/* ── Barra de navegación inferior ── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#FFFFFF',
        borderTop: '1px solid #E8EDF2',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.07)',
        display: 'flex',
        height: '64px',
      }}>
        {NAV_LINKS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="her-nav-item"
          >
            <span className="her-nav-icon">{icon}</span>
            <span className="her-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
