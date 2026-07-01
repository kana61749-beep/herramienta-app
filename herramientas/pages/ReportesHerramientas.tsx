import { useState } from 'react'

type TabReporte = 'resumen' | 'areas' | 'personal' | 'historial'

const TABS: { id: TabReporte; icono: string; label: string }[] = [
  { id: 'resumen',   icono: '📊', label: 'Resumen general' },
  { id: 'areas',     icono: '📍', label: 'Por área'        },
  { id: 'personal',  icono: '👩‍💼', label: 'Por personal'    },
  { id: 'historial', icono: '🕐', label: 'Historial'       },
]

const INDICADORES = [
  { label: 'Total revisiones',       valor: 0,    variante: 'azul',     icono: '📋' },
  { label: 'Herramientas revisadas', valor: 0,    variante: 'verde',    icono: '🔧' },
  { label: 'Pérdidas registradas',   valor: 0,    variante: 'rojo',     icono: '⚠️' },
  { label: 'Descuentos aplicados',   valor: '$0', variante: 'amarillo', icono: '💸' },
] as const

export default function ReportesHerramientas() {
  const [tab, setTab] = useState<TabReporte>('resumen')

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`.her-tab { transition: color 0.15s; } .her-tab:hover { color: #3BA9FF !important; }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>📊 Reportes</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Historial de revisiones y estadísticas del sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="exp-btn her-btn her-btn--secondary her-btn--sm" style={{ borderColor: '#86EFAC', color: '#16A34A' }}>
            📥 Exportar Excel
          </button>
          <button className="exp-btn her-btn her-btn--secondary her-btn--sm" style={{ borderColor: '#FCA5A5', color: '#DC2626' }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* ── Indicadores generales ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {INDICADORES.map(ind => (
          <div key={ind.label} className={`her-stat-card her-stat-card--${ind.variante}`}>
            <div className="her-stat-icon">{ind.icono}</div>
            <div className="her-stat-valor">{ind.valor}</div>
            <div className="her-stat-label">{ind.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className="her-tab"
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.625rem 0.875rem', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap',
              color: tab === t.id ? '#2563EB' : '#6B7280',
              borderBottom: tab === t.id ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.icono} {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenido por tab ── */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SeccionVacia icono="📋" titulo="Revisiones recientes" mensaje="No hay revisiones registradas aún." />
          <SeccionVacia icono="📈" titulo="Tendencia de pérdidas" mensaje="Sin datos suficientes para mostrar tendencias." />
        </div>
      )}
      {tab === 'areas' && (
        <SeccionVacia icono="📍" titulo="Reporte por área" mensaje="No hay datos de áreas para mostrar." />
      )}
      {tab === 'personal' && (
        <SeccionVacia icono="👩‍💼" titulo="Reporte por personal" mensaje="No hay datos de personal para mostrar." />
      )}
      {tab === 'historial' && (
        <SeccionVacia icono="🕐" titulo="Historial de revisiones" mensaje="No se han registrado revisiones todavía." />
      )}
    </div>
  )
}

function SeccionVacia({ icono, titulo, mensaje }: { icono: string; titulo: string; mensaje: string }) {
  return (
    <div className="her-card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
        {icono} {titulo}
      </div>
      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icono}</div>
        <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>{mensaje}</p>
      </div>
    </div>
  )
}
