import { useState, useEffect } from 'react'
import { supabase } from '../../src/lib/supabase'

const DIAS_LABEL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MESES      = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function calcularProxima(diaRevision: number): string {
  const hoy      = new Date()
  const jsTarget = diaRevision % 7 // 1→1 ... 6→6, 7→0(Dom)
  let diff       = jsTarget - hoy.getDay()
  if (diff < 0) diff += 7
  const proxima  = new Date(hoy)
  proxima.setDate(hoy.getDate() + diff)
  const d = proxima.getDate()
  const m = MESES[proxima.getMonth()]
  const y = proxima.getFullYear()
  return diff === 0
    ? `Hoy, ${d} de ${m}`
    : `${DIAS_LABEL[diaRevision]}, ${d} de ${m} de ${y}`
}

interface Config {
  dia:   number
  tarde: string
  noche: string
}

interface Contadores {
  areas:      number
  items:      number
  personal:   number
  perdidas:   number
  solicitudes: number
}

export default function Herramientas() {
  const [contadores, setContadores] = useState<Contadores>({ areas: 0, items: 0, personal: 0, perdidas: 0, solicitudes: 0 })
  const [config,     setConfig]     = useState<Config | null>(null)
  const [cargando,   setCargando]   = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [
      { count: areas },
      { count: items },
      { count: personal },
      { count: perdidas },
      { count: solicitudes },
      { data: cfg },
    ] = await Promise.all([
      supabase.from('herramientas_areas').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('herramientas_items').select('*', { count: 'exact', head: true }),
      supabase.from('herramientas_personal').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('herramientas_perdidas').select('*', { count: 'exact', head: true }),
      supabase.from('herramientas_solicitudes').select('*', { count: 'exact', head: true }),
      supabase.from('herramientas_config_revision').select('dia_revision_personal,hora_inicio_personal,hora_fin_personal').limit(1).maybeSingle(),
    ])
    setContadores({
      areas:       areas       ?? 0,
      items:       items       ?? 0,
      personal:    personal    ?? 0,
      perdidas:    perdidas    ?? 0,
      solicitudes: solicitudes ?? 0,
    })
    if (cfg) {
      setConfig({
        dia:   cfg.dia_revision_personal ?? 1,
        tarde: (cfg.hora_inicio_personal ?? '15:00:00').slice(0, 5),
        noche: (cfg.hora_fin_personal    ?? '20:00:00').slice(0, 5),
      })
    }
    setCargando(false)
  }

  const CARDS = [
    { icono: '📍', label: 'Áreas',        valor: contadores.areas,       variante: 'azul'     },
    { icono: '🔧', label: 'Herramientas', valor: contadores.items,       variante: 'morado'   },
    { icono: '👩‍💼', label: 'Personal',     valor: contadores.personal,    variante: 'verde'    },
    { icono: '⚠️', label: 'Pérdidas',     valor: contadores.perdidas,    variante: 'rojo'     },
    { icono: '📋', label: 'Solicitudes',  valor: contadores.solicitudes, variante: 'amarillo' },
  ] as const

  const proximaFecha = config ? calcularProxima(config.dia) : null

  return (
    <div>
      <style>{`
        .hi-body {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }
        .hi-revision { order: 1; }
        .hi-resumen  { order: 2; }
        .hi-alertas  { order: 3; }

        @media (min-width: 960px) {
          .hi-body {
            display: grid;
            grid-template-columns: 1fr 310px;
            grid-template-areas:
              "alertas resumen"
              "alertas revision";
            align-items: start;
          }
          .hi-alertas  { grid-area: alertas;  }
          .hi-resumen  { grid-area: resumen;  }
          .hi-revision { grid-area: revision; }
        }

        .hi-circ {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        @media (min-width: 480px) and (max-width: 959px) {
          .hi-circ { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      {/* ── Banner ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #3BA9FF 0%, #2563EB 40%, #123C7A 80%, #0D2554 100%)',
        padding: '2.25rem 2rem 2rem', minHeight: '160px',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20px',  right: '20px',  width: '130px', height: '130px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '35%', width: '170px', height: '170px', borderRadius: '50%', background: 'rgba(59,169,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '58px', height: '58px', flexShrink: 0,
            borderRadius: '16px', background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem',
          }}>
            🔧
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'white', lineHeight: 1.1 }}>
              ¡Bienvenido!
            </h1>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              Sistema de Control de Herramientas
            </p>
          </div>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div className="hi-body">

        {/* PRÓXIMA REVISIÓN */}
        <div className="hi-revision her-card" style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
          padding: '1.125rem 1.25rem',
          border: '1.5px solid #BFDBFE',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <span style={{ fontSize: '1rem' }}>📅</span>
            <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2563EB' }}>
              Próxima revisión
            </span>
          </div>

          {!config ? (
            <p style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.5 }}>
              Configura el día y horario en{' '}
              <span style={{ color: '#2563EB', fontWeight: '600' }}>Configuración</span>{' '}
              para ver la próxima revisión aquí.
            </p>
          ) : (
            <p style={{ margin: '0 0 0.875rem', fontSize: '0.9rem', fontWeight: '700', color: '#1E3A8A', lineHeight: 1.4 }}>
              {proximaFecha}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            {[
              { icono: '🌇', label: 'Tarde', valor: config?.tarde ?? '—' },
              { icono: '🌙', label: 'Noche', valor: config?.noche ?? '—' },
            ].map(h => (
              <div key={h.label} style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                background: 'white', border: '1.5px solid #BFDBFE',
                borderRadius: '10px', padding: '0.5rem 0.875rem', flex: '1 1 auto',
              }}>
                <span style={{ fontSize: '1.1rem' }}>{h.icono}</span>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: h.valor === '—' ? '#9CA3AF' : '#3BA9FF' }}>{h.valor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESUMEN GENERAL */}
        <div className="hi-resumen her-modulo">
          <div className="her-modulo-titulo">📊 Resumen general</div>
          {cargando ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem', margin: '1rem 0' }}>Cargando...</p>
          ) : (
            <div className="hi-circ">
              {CARDS.map(c => (
                <div key={c.label} className={`her-stat-card her-stat-card--${c.variante}`}>
                  <div className="her-stat-icon">{c.icono}</div>
                  <div className="her-stat-valor">{c.valor}</div>
                  <div className="her-stat-label">{c.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALERTAS */}
        <div className="hi-alertas">
          <div className="her-modulo-titulo" style={{ marginBottom: '0.75rem' }}>🚨 Alertas importantes</div>

          <div className="her-card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
              Sin alertas activas
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#9CA3AF' }}>
              Cuando haya herramientas perdidas, revisiones vencidas o solicitudes pendientes, aparecerán aquí.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
