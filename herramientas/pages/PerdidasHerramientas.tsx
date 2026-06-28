import { useState, type CSSProperties } from 'react'

type TabPerdida = 'todas' | 'primera' | 'segunda' | 'descuento' | 'encontradas' | 'repuestas'

const STATS = [
  { id: 'primera',    label: '1ª semana búsqueda', valor: 0, color: '#D97706', fondo: '#FEF3C7', icono: '🔍' },
  { id: 'segunda',    label: '2ª semana búsqueda', valor: 0, color: '#EA580C', fondo: '#FFF7ED', icono: '⏰' },
  { id: 'descuento',  label: 'Descuento pendiente', valor: 0, color: '#DC2626', fondo: '#FEE2E2', icono: '💸' },
  { id: 'encontradas',label: 'Encontradas',          valor: 0, color: '#16A34A', fondo: '#DCFCE7', icono: '✅' },
  { id: 'repuestas',  label: 'Repuestas',            valor: 0, color: '#0369A1', fondo: '#DBEAFE', icono: '🔄' },
]

const TABS: { id: TabPerdida; label: string }[] = [
  { id: 'todas',       label: 'Todas'           },
  { id: 'primera',     label: '1ª semana'       },
  { id: 'segunda',     label: '2ª semana'       },
  { id: 'descuento',   label: 'Con descuento'   },
  { id: 'encontradas', label: 'Encontradas'     },
  { id: 'repuestas',   label: 'Repuestas'       },
]

export default function PerdidasHerramientas() {
  const [tab, setTab] = useState<TabPerdida>('todas')

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`.her-tab { transition: color 0.15s; } .her-tab:hover { color: #0D9488 !important; }`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>⚠️ Pérdidas</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
          Control de herramientas perdidas y seguimiento de descuentos
        </p>
      </div>

      {/* ── Banner resumen ── */}
      <div style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', color: 'white' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.75)', marginBottom: '0.5rem' }}>
          Resumen de pérdidas
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>0</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>Pérdidas activas</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>Bs 0</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>Total en descuentos</div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{s.icono}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.valor}</div>
            <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: '600', marginTop: '0.2rem', lineHeight: 1.3 }}>{s.label}</div>
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
              padding: '0.625rem 0.75rem', fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap',
              color: tab === t.id ? '#DC2626' : '#6B7280',
              borderBottom: tab === t.id ? '2px solid #DC2626' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Lista vacía ── */}
      <div style={sCard}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#9CA3AF', fontWeight: '600' }}>0 registros</p>
        <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <p style={sTxtGris}>
            {tab === 'todas' ? 'No hay pérdidas registradas.' : `No hay pérdidas en esta categoría.`}
          </p>
          <p style={{ ...sTxtGris, fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Las pérdidas se registran automáticamente durante las revisiones.
          </p>
        </div>
      </div>
    </div>
  )
}

const sCard: CSSProperties    = { background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)' }
const sTxtGris: CSSProperties = { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }
