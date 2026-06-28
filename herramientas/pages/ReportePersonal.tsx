import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../../src/lib/supabase'

interface Props {
  persona: { id: string; nombre: string; foto_url: string | null }
  areaNombre: string | null
  onCerrar: () => void
}

interface AsigIncidencia {
  asignacion_id: string
  estado: 'perdida' | 'descuento' | 'reponer'
  nombre: string
  precio: number | null
  monto_descuento: number
  fecha_reporte: string | null
}

type Categoria = 'perdida' | 'descuento' | 'reponer'
type Periodo   = 'semana' | 'mes' | 'anio'

function semStr() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon.toISOString().split('T')[0]
}
function mesStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function anioStr() { return `${new Date().getFullYear()}-01-01` }
function formatBs(v: number) { return `Bs ${v.toFixed(2)}` }
function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
}
function startOf(p: Periodo) {
  if (p === 'semana') return semStr()
  if (p === 'mes') return mesStr()
  return anioStr()
}
function estadoLabel(e: Categoria) {
  return e === 'perdida' ? 'Activa' : e === 'descuento' ? 'Descontado' : 'Por reponer'
}
function estadoBadgeStyle(e: Categoria): CSSProperties {
  const base: CSSProperties = { fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '20px', whiteSpace: 'nowrap' as const }
  if (e === 'perdida')   return { ...base, color: '#DC2626', background: '#FEE2E2' }
  if (e === 'descuento') return { ...base, color: '#7C3AED', background: '#EDE9FE' }
  return { ...base, color: '#D97706', background: '#FEF3C7' }
}

export default function ReportePersonal({ persona, areaNombre, onCerrar }: Props) {
  const [asignaciones, setAsignaciones] = useState<AsigIncidencia[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [categoria,    setCategoria]    = useState<Categoria>('perdida')
  const [periodo,      setPeriodo]      = useState<Periodo>('mes')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [asigRes, perdRes] = await Promise.all([
      supabase.from('herramientas_asignaciones')
        .select('id, estado, herramientas_items(nombre, precio)')
        .eq('personal_id', persona.id)
        .is('fecha_devolucion', null)
        .in('estado', ['perdida', 'descuento', 'reponer']),
      supabase.from('herramientas_perdidas')
        .select('asignacion_id, monto_descuento, fecha_reporte')
        .eq('personal_id', persona.id)
        .order('fecha_reporte', { ascending: false }),
    ])

    const perdByAsig = new Map<string, { monto_descuento: number; fecha_reporte: string }>()
    for (const p of (perdRes.data ?? []) as { asignacion_id: string; monto_descuento: number; fecha_reporte: string }[]) {
      if (!perdByAsig.has(p.asignacion_id)) {
        perdByAsig.set(p.asignacion_id, { monto_descuento: p.monto_descuento, fecha_reporte: p.fecha_reporte })
      }
    }

    setAsignaciones(
      ((asigRes.data ?? []) as Record<string, unknown>[]).map(r => {
        const item = r.herramientas_items as { nombre: string; precio: number | null } | null
        const perd = perdByAsig.get(r.id as string)
        return {
          asignacion_id:   r.id as string,
          estado:          r.estado as Categoria,
          nombre:          item?.nombre ?? 'Herramienta',
          precio:          item?.precio ?? null,
          monto_descuento: perd?.monto_descuento ?? item?.precio ?? 0,
          fecha_reporte:   perd?.fecha_reporte ?? null,
        }
      })
    )
    setCargando(false)
  }

  const incPerdidas   = asignaciones.filter(a => a.estado === 'perdida')
  const incDescuentos = asignaciones.filter(a => a.estado === 'descuento')
  const incReponer    = asignaciones.filter(a => a.estado === 'reponer')

  const totalDescuentosMes = incDescuentos
    .filter(a => a.fecha_reporte && a.fecha_reporte >= mesStr())
    .reduce((acc, a) => acc + a.monto_descuento, 0)

  const categoriaItems = categoria === 'perdida' ? incPerdidas : categoria === 'descuento' ? incDescuentos : incReponer
  const listaFiltrada  = categoriaItems.filter(a => a.fecha_reporte && a.fecha_reporte >= startOf(periodo))

  const hoy = new Date().toISOString().split('T')[0]

  function generarPDF() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Reporte — ${persona.nombre}</title>
<style>
body{font-family:Arial,sans-serif;padding:2rem;color:#111;max-width:700px;margin:0 auto}
h1{color:#7C3AED;margin-bottom:0.25rem}
h2{color:#374151;font-size:1rem;border-bottom:2px solid #E5E7EB;padding-bottom:0.4rem;margin-top:1.5rem}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin:1rem 0}
.stat{background:#FAF5FF;border:1px solid #E9D5FF;border-radius:8px;padding:0.6rem;text-align:center}
.stat .val{font-size:1.3rem;font-weight:800;color:#7C3AED}
.stat .lbl{font-size:0.7rem;color:#6B7280;margin-top:0.15rem}
table{width:100%;border-collapse:collapse;font-size:0.85rem;margin-top:0.5rem}
th{background:#F9FAFB;text-align:left;padding:0.5rem;border:1px solid #E5E7EB;font-weight:600}
td{padding:0.5rem;border:1px solid #E5E7EB}
.total{background:#EDE9FE;border:1px solid #DDD6FE;border-radius:6px;padding:0.5rem 0.875rem;margin:0.5rem 0;display:flex;justify-content:space-between;font-weight:700}
.pie{margin-top:2rem;font-size:0.75rem;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:1rem}
</style></head><body>
<h1>📊 Reporte de Herramientas</h1>
<p style="color:#6B7280;margin-top:0">Colaborador: <strong>${persona.nombre}</strong> &nbsp;·&nbsp; Sector: <strong>${areaNombre ?? '—'}</strong> &nbsp;·&nbsp; Fecha: <strong>${formatFecha(hoy)}</strong></p>
<h2>Estado actual</h2>
<div class="stats">
  <div class="stat"><div class="val" style="color:#DC2626">${incPerdidas.length}</div><div class="lbl">⚠️ Pérdidas activas</div></div>
  <div class="stat"><div class="val" style="color:#7C3AED">${incDescuentos.length}</div><div class="lbl">💸 Descuentos</div></div>
  <div class="stat"><div class="val" style="color:#D97706">${incReponer.length}</div><div class="lbl">🔄 Para reponer</div></div>
</div>
${totalDescuentosMes > 0 ? `<div class="total"><span>💰 Total descuentos este mes</span><span>${formatBs(totalDescuentosMes)}</span></div>` : ''}
${incPerdidas.length > 0 ? `<h2>Pérdidas activas (${incPerdidas.length})</h2>
<table><tr><th>Herramienta</th><th>Fecha</th><th>Estado</th></tr>
${incPerdidas.map(a => `<tr><td>${a.nombre}</td><td>${a.fecha_reporte ? formatFecha(a.fecha_reporte) : '—'}</td><td>Activa</td></tr>`).join('')}
</table>` : ''}
${incDescuentos.length > 0 ? `<h2>Descuentos (${incDescuentos.length})</h2>
<table><tr><th>Herramienta</th><th>Fecha</th><th>Monto</th></tr>
${incDescuentos.map(a => `<tr><td>${a.nombre}</td><td>${a.fecha_reporte ? formatFecha(a.fecha_reporte) : '—'}</td><td>${formatBs(a.monto_descuento)}</td></tr>`).join('')}
</table>` : ''}
${incReponer.length > 0 ? `<h2>Para reponer (${incReponer.length})</h2>
<table><tr><th>Herramienta</th><th>Fecha</th><th>Precio ref.</th></tr>
${incReponer.map(a => `<tr><td>${a.nombre}</td><td>${a.fecha_reporte ? formatFecha(a.fecha_reporte) : '—'}</td><td>${formatBs(a.precio ?? 0)}</td></tr>`).join('')}
</table>` : ''}
<div class="pie">Generado el ${formatFecha(hoy)} · Sistema de Herramientas</div>
</body></html>`)
    win.document.close(); win.print()
  }

  function compartirWhatsApp() {
    const lineas = [
      `📊 *Reporte — ${persona.nombre}*`,
      `Sector: ${areaNombre ?? '—'} | ${formatFecha(hoy)}`,
      '',
      `⚠️ Pérdidas activas: ${incPerdidas.length}`,
      `💸 Descuentos: ${incDescuentos.length}${totalDescuentosMes > 0 ? ` · ${formatBs(totalDescuentosMes)} este mes` : ''}`,
      `🔄 Para reponer: ${incReponer.length}`,
    ]
    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank')
  }

  return (
    <>
      <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, backdropFilter: 'blur(2px)', animation: 'panelFade 0.18s ease' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(520px,100vw)', background: 'white', zIndex: 3001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)', animation: 'panelSlide 0.22s cubic-bezier(0.32,0.72,0,1)' }}>
        <style>{`@keyframes panelFade{from{opacity:0}to{opacity:1}} @keyframes panelSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', padding: '1.25rem 1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div>
              <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem' }}>📊 Reporte — {persona.nombre}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', marginTop: '0.2rem' }}>📍 {areaNombre ?? 'Sin sector'}</div>
            </div>
            <button onClick={onCerrar} style={sBtnX}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={generarPDF} style={sBtnHdr}>🖨️ PDF</button>
            <button onClick={compartirWhatsApp} style={sBtnHdr}>📱 WhatsApp</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {cargando ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Cargando reporte...</p>
          ) : (
            <>
              {/* PRUEBA DEPLOY */}
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.72rem', color: '#15803D', fontWeight: '600', textAlign: 'center' }}>
                ✅ Versión reporte actualizado — deploy confirmado
              </div>
              {/* ── 3 tarjetas resumen ── */}
              <div>
                <div style={sTitSec}>Estado actual</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginTop: '0.625rem' }}>
                  <StatCard val={incPerdidas.length}   label="⚠️ Pérdidas"   bg="#FEE2E2" border="#FECACA" color="#DC2626" />
                  <StatCard val={incDescuentos.length}  label="💸 Descuentos"  bg="#EDE9FE" border="#DDD6FE" color="#7C3AED" />
                  <StatCard val={incReponer.length}     label="🔄 Reponer"     bg="#FEF3C7" border="#FDE68A" color="#D97706" />
                </div>
                {totalDescuentosMes > 0 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.875rem', background: '#EDE9FE', border: '1px solid #DDD6FE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: '#5B21B6', fontWeight: '600' }}>💰 Total descuentos este mes</span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#7C3AED' }}>{formatBs(totalDescuentosMes)}</span>
                  </div>
                )}
              </div>

              {/* ── Filtro combinado ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={sTitSec}>Ver por categoría y período</div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {(['perdida', 'descuento', 'reponer'] as Categoria[]).map(cat => {
                    const c = CAT_COLORS[cat]
                    const activo = categoria === cat
                    return (
                      <button key={cat} onClick={() => setCategoria(cat)} style={{
                        flex: 1, padding: '0.5rem 0.25rem', borderRadius: '8px',
                        border: `1.5px solid ${activo ? c.activeBg : c.border}`,
                        background: activo ? c.activeBg : c.bg,
                        color: activo ? c.activeColor : c.color,
                        fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer',
                      }}>
                        {CAT_LABELS[cat]}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {(['semana', 'mes', 'anio'] as Periodo[]).map(p => {
                    const activo = periodo === p
                    return (
                      <button key={p} onClick={() => setPeriodo(p)} style={{
                        flex: 1, padding: '0.375rem 0.25rem', borderRadius: '6px',
                        border: `1px solid ${activo ? '#374151' : '#E5E7EB'}`,
                        background: activo ? '#374151' : '#F9FAFB',
                        color: activo ? 'white' : '#6B7280',
                        fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer',
                      }}>
                        {PERIODO_LABELS[p]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── Lista filtrada ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={sTitSec}>{CAT_LABELS[categoria]} · {PERIODO_LABELS[periodo]}</div>
                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{listaFiltrada.length} registro{listaFiltrada.length !== 1 ? 's' : ''}</span>
                </div>
                {listaFiltrada.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#F9FAFB', borderRadius: '10px', border: '1.5px dashed #E5E7EB' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>📭</div>
                    <p style={{ color: '#6B7280', fontWeight: '600', margin: 0, fontSize: '0.85rem' }}>Sin registros en este período</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {listaFiltrada.map(item => <ItemCard key={item.asignacion_id} item={item} />)}
                  </div>
                )}
              </div>

              {asignaciones.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1.5px dashed #E5E7EB' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                  <p style={{ color: '#374151', fontWeight: '600', margin: '0 0 0.25rem' }}>Sin incidencias registradas</p>
                  <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>Este colaborador no tiene pérdidas, descuentos ni herramientas para reponer.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
          <button onClick={onCerrar} style={sBtnSec}>Cerrar</button>
        </div>
      </div>
    </>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function ItemCard({ item, subtitulo }: { item: AsigIncidencia; subtitulo?: string }) {
  const c = CAT_COLORS[item.estado]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', border: `1px solid ${c.border}`, borderRadius: '8px', background: c.bg, gap: '0.5rem' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.1rem' }}>
          {subtitulo ? `${subtitulo} · ` : ''}{item.fecha_reporte ? formatFecha(item.fecha_reporte) : 'Sin fecha'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {item.estado === 'descuento' && item.monto_descuento > 0 && (
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#7C3AED' }}>{formatBs(item.monto_descuento)}</span>
        )}
        {item.estado === 'reponer' && (item.precio ?? 0) > 0 && (
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#D97706' }}>{formatBs(item.precio!)}</span>
        )}
        <span style={estadoBadgeStyle(item.estado)}>{estadoLabel(item.estado)}</span>
      </div>
    </div>
  )
}

function StatCard({ val, label, bg, border, color }: { val: number; label: string; bg: string; border: string; color: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.625rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: '800', color }}>{val}</div>
      <div style={{ fontSize: '0.68rem', color, opacity: 0.8, marginTop: '0.15rem' }}>{label}</div>
    </div>
  )
}

// ── Constantes ────────────────────────────────────────────────────────────────
const CAT_LABELS: Record<Categoria, string> = {
  perdida:   'Pérdidas',
  descuento: 'Descuentos',
  reponer:   'Para reponer',
}
const CAT_COLORS: Record<Categoria, { bg: string; border: string; color: string; activeBg: string; activeColor: string }> = {
  perdida:   { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', activeBg: '#DC2626', activeColor: 'white' },
  descuento: { bg: '#FAF5FF', border: '#DDD6FE', color: '#7C3AED', activeBg: '#7C3AED', activeColor: 'white' },
  reponer:   { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', activeBg: '#D97706', activeColor: 'white' },
}
const PERIODO_LABELS: Record<Periodo, string> = { semana: 'Semana', mes: 'Mes', anio: 'Año' }

// ── Estilos ───────────────────────────────────────────────────────────────────
const sTitSec: CSSProperties = { fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
const sBtnX:   CSSProperties = { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px', padding: '0.375rem 0.5rem', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }
const sBtnHdr: CSSProperties = { flex: 1, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }
const sBtnSec: CSSProperties = { background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', width: '100%' }
