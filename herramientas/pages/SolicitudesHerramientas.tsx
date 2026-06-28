import { useState, type CSSProperties } from 'react'

type EstadoSol = 'todas' | 'pendientes' | 'entregadas' | 'repuestas' | 'rechazadas'

const STATS = [
  { id: 'pendientes',  label: 'Pendientes',  valor: 0, color: '#D97706', fondo: '#FEF3C7', icono: '⏳' },
  { id: 'entregadas',  label: 'Entregadas',  valor: 0, color: '#0369A1', fondo: '#DBEAFE', icono: '📦' },
  { id: 'repuestas',   label: 'Repuestas',   valor: 0, color: '#16A34A', fondo: '#DCFCE7', icono: '✅' },
  { id: 'rechazadas',  label: 'Rechazadas',  valor: 0, color: '#DC2626', fondo: '#FEE2E2', icono: '❌' },
]

const TABS: { id: EstadoSol; label: string; count: number }[] = [
  { id: 'todas',      label: 'Todas',      count: 0 },
  { id: 'pendientes', label: 'Pendientes', count: 0 },
  { id: 'entregadas', label: 'Entregadas', count: 0 },
  { id: 'repuestas',  label: 'Repuestas',  count: 0 },
  { id: 'rechazadas', label: 'Rechazadas', count: 0 },
]

export default function SolicitudesHerramientas() {
  const [tab,      setTab]      = useState<EstadoSol>('todas')
  const [busqueda, setBusqueda] = useState('')

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`.her-input:focus { border-color: #0D9488 !important; outline: none; box-shadow: 0 0 0 3px rgba(13,148,136,0.12); } .her-tab:hover { color: #0D9488 !important; }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>📋 Solicitudes</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Pedidos de herramientas y seguimiento de entregas
          </p>
        </div>
        <button style={sBtnPrimario}>+ Nueva solicitud</button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '0.875rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{s.icono}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.valor}</div>
            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: '600', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Buscador ── */}
      <input
        className="her-input"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar solicitud por herramienta o colaborador..."
        style={{ ...sInput, maxWidth: '420px', marginBottom: '1rem' }}
      />

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className="her-tab"
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap',
              color: tab === t.id ? '#0D9488' : '#6B7280',
              borderBottom: tab === t.id ? '2px solid #0D9488' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.label}
            <span style={{ padding: '0.1rem 0.45rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', background: tab === t.id ? '#CCFBF1' : '#F3F4F6', color: tab === t.id ? '#0D9488' : '#9CA3AF' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Lista vacía ── */}
      <div style={sCard}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#9CA3AF', fontWeight: '600' }}>0 solicitudes</p>
        <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
          <p style={sTxtGris}>No hay solicitudes registradas.</p>
          <p style={{ ...sTxtGris, fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Las solicitudes de herramientas aparecerán aquí.
          </p>
        </div>
      </div>
    </div>
  )
}

const sCard: CSSProperties         = { background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)' }
const sInput: CSSProperties        = { padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white', width: '100%' }
const sTxtGris: CSSProperties      = { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }
const sBtnPrimario: CSSProperties  = { background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }
