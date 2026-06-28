import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../../src/lib/supabase'

interface Props {
  area: { id: string; nombre: string }
  personalIds: string[]
  colaboradores: { id: string; nombre: string }[]
  onCerrar: () => void
}

interface AsigIncidencia {
  asignacion_id: string
  personal_id: string
  personal_nombre: string
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
function sBtnCat(cat: Categoria): CSSProperties {
  const c = CAT_COLORS[cat]
  return { background: 'white', border: `1.5px solid ${c.border}`, color: c.color, borderRadius: '7px', padding: '0.35rem 0.625rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }
}

export default function ReporteGeneral({ area, personalIds, colaboradores, onCerrar }: Props) {
  const [asignaciones,    setAsignaciones]    = useState<AsigIncidencia[]>([])
  const [cargando,        setCargando]        = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria | null>(null)
  const [periodos,        setPeriodos]        = useState<Record<Categoria, Periodo>>({
    perdida: 'mes', descuento: 'mes', reponer: 'mes',
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    if (personalIds.length === 0) { setCargando(false); return }
    setCargando(true)

    const colMap = new Map(colaboradores.map(c => [c.id, c.nombre]))

    const [asigRes, perdRes] = await Promise.all([
      supabase.from('herramientas_asignaciones')
        .select('id, personal_id, estado, herramientas_items(nombre, precio)')
        .in('personal_id', personalIds)
        .is('fecha_devolucion', null)
        .in('estado', ['perdida', 'descuento', 'reponer']),
      supabase.from('herramientas_perdidas')
        .select('asignacion_id, personal_id, monto_descuento, fecha_reporte')
        .in('personal_id', personalIds)
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
          personal_id:     r.personal_id as string,
          personal_nombre: colMap.get(r.personal_id as string) ?? 'Colaborador',
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

  const rankingPersonal = colaboradores
    .map(c => ({
      ...c,
      perdActivas: incPerdidas.filter(a => a.personal_id === c.id).length,
      descuentos:  incDescuentos.filter(a => a.personal_id === c.id).length,
      reponer:     incReponer.filter(a => a.personal_id === c.id).length,
      total:       asignaciones.filter(a => a.personal_id === c.id).length,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.perdActivas - a.perdActivas || b.descuentos - a.descuentos || b.total - a.total)
    .slice(0, 5)

  const toolCount = new Map<string, number>()
  for (const a of asignaciones) toolCount.set(a.nombre, (toolCount.get(a.nombre) ?? 0) + 1)
  const rankingTools = Array.from(toolCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const hoy = new Date().toISOString().split('T')[0]

  function toggleCategoria(cat: Categoria) {
    setCategoriaActiva(prev => prev === cat ? null : cat)
  }
  function cambiarPeriodo(cat: Categoria, p: Periodo) {
    setPeriodos(prev => ({ ...prev, [cat]: p }))
  }

  function itemsDeCat(cat: Categoria) {
    return cat === 'perdida' ? incPerdidas : cat === 'descuento' ? incDescuentos : incReponer
  }
  function listaFiltradaDe(cat: Categoria) {
    return itemsDeCat(cat).filter(a => a.fecha_reporte && a.fecha_reporte >= startOf(periodos[cat]))
  }

  // ── PDF general ──────────────────────────────────────────────────────────────
  function generarPDF() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Reporte General — ${area.nombre}</title>
<style>
body{font-family:Arial,sans-serif;padding:2rem;color:#111;max-width:700px;margin:0 auto}
h1{color:#6D28D9;margin-bottom:0.25rem}
h2{color:#374151;font-size:1rem;border-bottom:2px solid #E5E7EB;padding-bottom:0.4rem;margin-top:1.5rem}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin:1rem 0}
.stat{background:#FAF5FF;border:1px solid #E9D5FF;border-radius:8px;padding:0.6rem;text-align:center}
.stat .val{font-size:1.3rem;font-weight:800;color:#6D28D9}
.stat .lbl{font-size:0.7rem;color:#6B7280;margin-top:0.15rem}
table{width:100%;border-collapse:collapse;font-size:0.85rem;margin-top:0.5rem}
th{background:#F9FAFB;text-align:left;padding:0.5rem;border:1px solid #E5E7EB;font-weight:600}
td{padding:0.5rem;border:1px solid #E5E7EB}
.total{background:#EDE9FE;border:1px solid #DDD6FE;border-radius:6px;padding:0.5rem 0.875rem;margin:0.5rem 0;display:flex;justify-content:space-between;font-weight:700}
.pie{margin-top:2rem;font-size:0.75rem;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:1rem}
</style></head><body>
<h1>📊 Reporte General de Herramientas</h1>
<p style="color:#6B7280;margin-top:0">Sector: <strong>${area.nombre}</strong> &nbsp;·&nbsp; Fecha: <strong>${formatFecha(hoy)}</strong> &nbsp;·&nbsp; Personal: <strong>${colaboradores.length}</strong></p>
<h2>Estado actual del sector</h2>
<div class="stats">
  <div class="stat"><div class="val" style="color:#DC2626">${incPerdidas.length}</div><div class="lbl">⚠️ Pérdidas activas</div></div>
  <div class="stat"><div class="val" style="color:#7C3AED">${incDescuentos.length}</div><div class="lbl">💸 Descuentos</div></div>
  <div class="stat"><div class="val" style="color:#D97706">${incReponer.length}</div><div class="lbl">🔄 Para reponer</div></div>
</div>
${totalDescuentosMes > 0 ? `<div class="total"><span>💰 Total descuentos del sector este mes</span><span>${formatBs(totalDescuentosMes)}</span></div>` : ''}
${rankingPersonal.length > 0 ? `<h2>Personal con más incidencias activas</h2>
<table><tr><th>#</th><th>Colaborador</th><th>Pérdidas</th><th>Descuentos</th><th>Reponer</th></tr>
${rankingPersonal.map((c, i) => `<tr><td>${i + 1}</td><td>${c.nombre}</td><td>${c.perdActivas}</td><td>${c.descuentos}</td><td>${c.reponer}</td></tr>`).join('')}
</table>` : ''}
${rankingTools.length > 0 ? `<h2>Herramientas más perdidas</h2>
<table><tr><th>#</th><th>Herramienta</th><th>Incidencias activas</th></tr>
${rankingTools.map(([nombre, count], i) => `<tr><td>${i + 1}</td><td>${nombre}</td><td>${count}</td></tr>`).join('')}
</table>` : ''}
<div class="pie">Generado el ${formatFecha(hoy)} · Sistema de Herramientas</div>
</body></html>`)
    win.document.close(); win.print()
  }

  // ── WhatsApp general ─────────────────────────────────────────────────────────
  function compartirWhatsApp() {
    const lineas = [
      `📊 *Reporte General — ${area.nombre}*`,
      `Fecha: ${formatFecha(hoy)} | Personal: ${colaboradores.length}`,
      '',
      `⚠️ Pérdidas activas: ${incPerdidas.length}`,
      `💸 Descuentos: ${incDescuentos.length}${totalDescuentosMes > 0 ? ` · ${formatBs(totalDescuentosMes)} este mes` : ''}`,
      `🔄 Para reponer: ${incReponer.length}`,
      '',
      rankingPersonal.length > 0
        ? `*Top incidencias:*\n${rankingPersonal.map((c, i) => `${i + 1}. ${c.nombre}: ${c.perdActivas} perd, ${c.descuentos} desc`).join('\n')}`
        : '✅ Sin incidencias activas en el sector',
    ]
    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank')
  }

  // ── PDF por categoría ────────────────────────────────────────────────────────
  function generarPDFCategoria(cat: Categoria) {
    const p = periodos[cat]
    const items = listaFiltradaDe(cat)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${CAT_LABELS[cat]} — ${area.nombre}</title>
<style>
body{font-family:Arial,sans-serif;padding:2rem;color:#111;max-width:700px;margin:0 auto}
h1{color:#6D28D9;margin-bottom:0.25rem}
h2{color:#374151;font-size:1rem;border-bottom:2px solid #E5E7EB;padding-bottom:0.4rem;margin-top:1.5rem}
table{width:100%;border-collapse:collapse;font-size:0.85rem;margin-top:0.5rem}
th{background:#F9FAFB;text-align:left;padding:0.5rem;border:1px solid #E5E7EB;font-weight:600}
td{padding:0.5rem;border:1px solid #E5E7EB}
.pie{margin-top:2rem;font-size:0.75rem;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:1rem}
</style></head><body>
<h1>📊 ${CAT_LABELS[cat]} — ${PERIODO_LABELS[p]}</h1>
<p style="color:#6B7280;margin-top:0">Sector: <strong>${area.nombre}</strong> &nbsp;·&nbsp; Fecha: <strong>${formatFecha(hoy)}</strong></p>
<h2>${CAT_LABELS[cat]} · ${PERIODO_LABELS[p]} (${items.length})</h2>
${items.length === 0
  ? '<p style="color:#9CA3AF">Sin registros en este período.</p>'
  : cat === 'descuento'
    ? `<table><tr><th>Colaborador</th><th>Herramienta</th><th>Fecha</th><th>Monto</th></tr>
${items.map(a => `<tr><td>${a.personal_nombre}</td><td>${a.nombre}</td><td>${a.fecha_reporte ? formatFecha(a.fecha_reporte) : '—'}</td><td>${formatBs(a.monto_descuento)}</td></tr>`).join('')}</table>`
    : `<table><tr><th>Colaborador</th><th>Herramienta</th><th>Fecha</th><th>${cat === 'reponer' ? 'Precio ref.' : 'Estado'}</th></tr>
${items.map(a => `<tr><td>${a.personal_nombre}</td><td>${a.nombre}</td><td>${a.fecha_reporte ? formatFecha(a.fecha_reporte) : '—'}</td><td>${cat === 'reponer' ? formatBs(a.precio ?? 0) : 'Activa'}</td></tr>`).join('')}</table>`}
<div class="pie">Generado el ${formatFecha(hoy)} · Sistema de Herramientas</div>
</body></html>`)
    win.document.close(); win.print()
  }

  // ── WhatsApp por categoría ───────────────────────────────────────────────────
  function compartirWhatsAppCategoria(cat: Categoria) {
    const p = periodos[cat]
    const items = listaFiltradaDe(cat)
    const lineas = [
      `📊 *${CAT_LABELS[cat]} — ${PERIODO_LABELS[p]}*`,
      `Sector: ${area.nombre} | ${formatFecha(hoy)}`,
      '',
      items.length === 0
        ? 'Sin registros en este período.'
        : items.map(a =>
            `• ${a.personal_nombre}: ${a.nombre} — ${a.fecha_reporte ? formatFecha(a.fecha_reporte) : 'Sin fecha'}` +
            (cat === 'descuento' ? ` — ${formatBs(a.monto_descuento)}` : '') +
            (cat === 'reponer' && a.precio ? ` — ref. ${formatBs(a.precio)}` : '')
          ).join('\n'),
    ]
    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank')
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, backdropFilter: 'blur(2px)', animation: 'panelFade 0.18s ease' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(520px,100vw)', background: 'white', zIndex: 3001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)', animation: 'panelSlide 0.22s cubic-bezier(0.32,0.72,0,1)' }}>
        <style>{`@keyframes panelFade{from{opacity:0}to{opacity:1}} @keyframes panelSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header — PDF general / WhatsApp general */}
        <div style={{ background: 'linear-gradient(135deg,#6D28D9,#5B21B6)', padding: '1.25rem 1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div>
              <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem' }}>📊 Reporte General</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Sector: {area.nombre} · {colaboradores.length} colaboradores</div>
            </div>
            <button onClick={onCerrar} style={sBtnX}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={generarPDF} style={sBtnHdr}>🖨️ PDF general</button>
            <button onClick={compartirWhatsApp} style={sBtnHdr}>📱 WhatsApp general</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {cargando ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Cargando reporte...</p>
          ) : personalIds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <p style={{ color: '#9CA3AF' }}>No hay personal en este sector.</p>
            </div>
          ) : (
            <>
              {/* ── Estado actual: tarjetas clicables ── */}
              <div>
                <div style={sTitSec}>Estado actual del sector</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginTop: '0.625rem' }}>
                  <StatCard
                    val={incPerdidas.length} label="⚠️ Pérdidas"
                    bg="#FEE2E2" border="#FECACA" color="#DC2626"
                    activo={categoriaActiva === 'perdida'}
                    onClick={() => toggleCategoria('perdida')}
                  />
                  <StatCard
                    val={incDescuentos.length} label="💸 Descuentos"
                    bg="#EDE9FE" border="#DDD6FE" color="#7C3AED"
                    activo={categoriaActiva === 'descuento'}
                    onClick={() => toggleCategoria('descuento')}
                  />
                  <StatCard
                    val={incReponer.length} label="🔄 Reponer"
                    bg="#FEF3C7" border="#FDE68A" color="#D97706"
                    activo={categoriaActiva === 'reponer'}
                    onClick={() => toggleCategoria('reponer')}
                  />
                </div>
                {totalDescuentosMes > 0 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.625rem 0.875rem', background: '#EDE9FE', border: '1px solid #DDD6FE', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: '#5B21B6', fontWeight: '600' }}>💰 Total descuentos del sector este mes</span>
                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#7C3AED' }}>{formatBs(totalDescuentosMes)}</span>
                  </div>
                )}
              </div>

              {/* ── Sección expandida de la categoría activa ── */}
              {categoriaActiva && (() => {
                const c = CAT_COLORS[categoriaActiva]
                const lista = listaFiltradaDe(categoriaActiva)
                const p = periodos[categoriaActiva]
                return (
                  <div style={{ border: `1.5px solid ${c.border}`, borderRadius: '12px', padding: '1rem', background: c.bg }}>
                    {/* Título + botones PDF/WhatsApp de categoría */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: c.color }}>{CAT_LABELS[categoriaActiva]}</span>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => generarPDFCategoria(categoriaActiva)} style={sBtnCat(categoriaActiva)}>🖨️ PDF</button>
                        <button onClick={() => compartirWhatsAppCategoria(categoriaActiva)} style={sBtnCat(categoriaActiva)}>📱 WhatsApp</button>
                      </div>
                    </div>

                    {/* Filtros de período — independientes por categoría */}
                    <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
                      {(['semana', 'mes', 'anio'] as Periodo[]).map(per => {
                        const activo = p === per
                        return (
                          <button key={per} onClick={() => cambiarPeriodo(categoriaActiva, per)} style={{
                            flex: 1, padding: '0.375rem 0.25rem', borderRadius: '6px',
                            border: `1px solid ${activo ? c.activeBg : '#E5E7EB'}`,
                            background: activo ? c.activeBg : 'white',
                            color: activo ? c.activeColor : '#6B7280',
                            fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer',
                          }}>
                            {PERIODO_LABELS[per]}
                          </button>
                        )
                      })}
                    </div>

                    {/* Lista filtrada */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <div style={sTitSec}>{CAT_LABELS[categoriaActiva]} · {PERIODO_LABELS[p]}</div>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{lista.length} registro{lista.length !== 1 ? 's' : ''}</span>
                    </div>
                    {lista.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.25rem', background: 'white', borderRadius: '8px', border: '1px dashed #E5E7EB' }}>
                        <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>📭</div>
                        <p style={{ color: '#6B7280', fontWeight: '600', margin: 0, fontSize: '0.82rem' }}>Sin registros en este período</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {lista.map(item => <ItemCard key={item.asignacion_id} item={item} subtitulo={item.personal_nombre} />)}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Ranking personal ── */}
              {rankingPersonal.length > 0 ? (
                <div>
                  <div style={sTitSec}>Personal con más incidencias activas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.625rem' }}>
                    {rankingPersonal.map((c, i) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.875rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: 'white' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 ? '#FEF3C7' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: i === 0 ? '#D97706' : '#6B7280', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, fontWeight: '600', fontSize: '0.85rem', color: '#111827' }}>{c.nombre}</div>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {c.perdActivas > 0 && <Chip label={`${c.perdActivas} perd.`} bg="#FEE2E2" color="#DC2626" />}
                          {c.descuentos  > 0 && <Chip label={`${c.descuentos} desc.`} bg="#EDE9FE" color="#7C3AED" />}
                          {c.reponer     > 0 && <Chip label={`${c.reponer} rep.`}     bg="#FEF3C7" color="#D97706" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <span>✅</span><span style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Sin incidencias activas en el sector</span>
                </div>
              )}

              {/* ── Herramientas más perdidas ── */}
              {rankingTools.length > 0 && (
                <div>
                  <div style={sTitSec}>Herramientas más perdidas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.625rem' }}>
                    {rankingTools.map(([nombre, count], i) => (
                      <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.875rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: 'white' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: '#DC2626', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, fontWeight: '600', fontSize: '0.85rem', color: '#111827' }}>🔧 {nombre}</div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#DC2626' }}>{count}×</span>
                      </div>
                    ))}
                  </div>
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
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', background: 'white', gap: '0.5rem' }}>
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

function StatCard({ val, label, bg, border, color, activo, onClick }: {
  val: number; label: string; bg: string; border: string; color: string
  activo?: boolean; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: activo ? color : bg,
        border: `${activo ? '2px' : '1px'} solid ${activo ? color : border}`,
        borderRadius: '10px', padding: '0.625rem', textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: activo ? 'white' : color }}>{val}</div>
      <div style={{ fontSize: '0.68rem', color: activo ? 'rgba(255,255,255,0.85)' : color, opacity: activo ? 1 : 0.8, marginTop: '0.15rem' }}>{label}</div>
      <div style={{ fontSize: '0.6rem', marginTop: '0.2rem', color: activo ? 'rgba(255,255,255,0.65)' : color, opacity: 0.6 }}>
        {activo ? '▲ cerrar' : '▼ ver'}
      </div>
    </div>
  )
}

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: '700', color, background: bg, padding: '0.15rem 0.45rem', borderRadius: '20px', whiteSpace: 'nowrap' as const }}>{label}</span>
  )
}

// ── Constantes ────────────────────────────────────────────────────────────────
const CAT_LABELS: Record<Categoria, string> = {
  perdida: 'Pérdidas', descuento: 'Descuentos', reponer: 'Para reponer',
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
