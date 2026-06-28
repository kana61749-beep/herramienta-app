import { useState, type CSSProperties } from 'react'

type TabReporte = 'resumen' | 'areas' | 'personal' | 'historial'

const TABS: { id: TabReporte; icono: string; label: string }[] = [
  { id: 'resumen',   icono: '📊', label: 'Resumen general' },
  { id: 'areas',     icono: '📍', label: 'Por área'        },
  { id: 'personal',  icono: '👩‍💼', label: 'Por personal'    },
  { id: 'historial', icono: '🕐', label: 'Historial'       },
]

const INDICADORES = [
  { label: 'Total revisiones',     valor: 0, color: '#0D9488', icono: '📋' },
  { label: 'Herramientas revisadas', valor: 0, color: '#0369A1', icono: '🔧' },
  { label: 'Pérdidas registradas', valor: 0, color: '#DC2626', icono: '⚠️' },
  { label: 'Descuentos aplicados', valor: '$0', color: '#7C3AED', icono: '💸' },
]

export default function ReportesHerramientas() {
  const [tab, setTab] = useState<TabReporte>('resumen')

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`.her-tab { transition: color 0.15s; } .her-tab:hover { color: #0D9488 !important; } .exp-btn:hover { opacity: 0.85; }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>📊 Reportes</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Historial de revisiones y estadísticas del sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="exp-btn" style={{ ...sBtnExportar, borderColor: '#16A34A', color: '#16A34A' }}>
            📥 Exportar Excel
          </button>
          <button className="exp-btn" style={{ ...sBtnExportar, borderColor: '#DC2626', color: '#DC2626' }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* ── Indicadores generales ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {INDICADORES.map(ind => (
          <div key={ind.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>{ind.icono}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: ind.color, lineHeight: 1 }}>{ind.valor}</div>
            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: '600', marginTop: '0.3rem', lineHeight: 1.3 }}>{ind.label}</div>
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
              color: tab === t.id ? '#0D9488' : '#6B7280',
              borderBottom: tab === t.id ? '2px solid #0D9488' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.icono} {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenido por tab ── */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
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

const sBtnExportar: CSSProperties = { background: 'white', border: '1.5px solid', borderRadius: '8px', padding: '0.45rem 0.875rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }
