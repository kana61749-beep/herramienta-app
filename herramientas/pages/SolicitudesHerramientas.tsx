import { useState, type CSSProperties } from 'react'

type EstadoSol = 'todas' | 'pendientes' | 'entregadas' | 'repuestas' | 'rechazadas'

const STATS = [
  { id: 'pendientes',  label: 'Pendientes',  valor: 0, variante: 'amarillo', icono: '⏳' },
  { id: 'entregadas',  label: 'Entregadas',  valor: 0, variante: 'azul',     icono: '📦' },
  { id: 'repuestas',   label: 'Repuestas',   valor: 0, variante: 'verde',    icono: '✅' },
  { id: 'rechazadas',  label: 'Rechazadas',  valor: 0, variante: 'rojo',     icono: '❌' },
] as const

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
      <style>{`.her-input:focus { border-color: #3BA9FF !important; outline: none; box-shadow: 0 0 0 3px rgba(59,169,255,0.12); } .her-tab:hover { color: #2563EB !important; }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>📋 Solicitudes</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Pedidos de herramientas y seguimiento de entregas
          </p>
        </div>
        <button className="her-btn her-btn--primary">+ Nueva solicitud</button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {STATS.map(s => (
          <div key={s.label} className={`her-stat-card her-stat-card--${s.variante}`}>
            <div className="her-stat-icon">{s.icono}</div>
            <div className="her-stat-valor">{s.valor}</div>
            <div className="her-stat-label">{s.label}</div>
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
              color: tab === t.id ? '#2563EB' : '#6B7280',
              borderBottom: tab === t.id ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.label}
            <span style={{ padding: '0.1rem 0.45rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700', background: tab === t.id ? '#DBEAFE' : '#F3F4F6', color: tab === t.id ? '#2563EB' : '#9CA3AF' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Lista vacía ── */}
      <div className="her-card" style={{ padding: '1.25rem' }}>
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

const sInput: CSSProperties        = { padding: '0.6rem 0.8rem', borderRadius: '12px', border: '1.5px solid #E8EDF2', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white', width: '100%', transition: 'border-color 0.15s, box-shadow 0.15s' }
const sTxtGris: CSSProperties      = { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }
