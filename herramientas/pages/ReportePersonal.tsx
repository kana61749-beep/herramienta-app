import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../../src/lib/supabase'

interface Props {
  persona: { id: string; nombre: string; foto_url: string | null }
  areaNombre: string | null
  onCerrar: () => void
  onRefresh?: () => void
}

interface AsigIncidencia {
  asignacion_id: string
  estado: 'perdida' | 'descuento' | 'reponer'
  nombre: string
  precio: number | null
  monto_descuento: number
  fecha_reporte: string | null
}

interface RevisionHist {
  id: string
  fecha_revision: string
  fecha_esperada: string | null
  dias_retraso: number
  observaciones: string | null
  detalles: { nombre: string; resultado: 'tiene' | 'perdida' | 'reponer' | 'descuento' }[]
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
function formatFechaCorta(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(2)}`
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

export default function ReportePersonal({ persona, areaNombre, onCerrar, onRefresh }: Props) {
  const [asignaciones,    setAsignaciones]    = useState<AsigIncidencia[]>([])
  const [cargando,        setCargando]        = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState<Categoria | null>(null)
  const [periodos,        setPeriodos]        = useState<Record<Categoria, Periodo>>({
    perdida: 'mes', descuento: 'mes', reponer: 'mes',
  })
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [revisiones,       setRevisiones]       = useState<RevisionHist[]>([])
  const [cargandoHist,     setCargandoHist]     = useState(false)
  const [periodoHist,      setPeriodoHist]      = useState<Periodo>('mes')
  const [confirmElim,      setConfirmElim]      = useState<Periodo | null>(null)
  const [eliminando,       setEliminando]       = useState(false)
  const [errElim,          setErrElim]          = useState('')

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (historialAbierto) cargarHistorial() }, [periodoHist, historialAbierto]) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function cargarHistorial() {
    setCargandoHist(true)
    const { data } = await supabase
      .from('herramientas_revisiones')
      .select(`id, fecha_revision, dias_retraso, fecha_esperada, observaciones,
        herramientas_revision_detalle(resultado,
          herramientas_asignaciones(herramientas_items(nombre)))`)
      .eq('personal_id', persona.id)
      .eq('tipo', 'personal')
      .gte('fecha_revision', startOf(periodoHist))
      .order('fecha_revision', { ascending: false })

    setRevisiones(
      ((data ?? []) as Record<string, unknown>[]).map(r => ({
        id: r.id as string,
        fecha_revision: r.fecha_revision as string,
        fecha_esperada: r.fecha_esperada as string | null,
        dias_retraso: (r.dias_retraso as number) ?? 0,
        observaciones: r.observaciones as string | null,
        detalles: ((r.herramientas_revision_detalle as Record<string, unknown>[]) ?? []).map(d => {
          const asig = d.herramientas_asignaciones as { herramientas_items: { nombre: string } | null } | null
          return {
            nombre: asig?.herramientas_items?.nombre ?? 'Herramienta',
            resultado: d.resultado as 'tiene' | 'perdida' | 'reponer' | 'descuento',
          }
        }),
      }))
    )
    setCargandoHist(false)
  }

  async function eliminarHistorial(p: Periodo) {
    setEliminando(true)
    setErrElim('')

    // 1 — IDs de revisiones a borrar
    const { data: revs, error: selErr } = await supabase
      .from('herramientas_revisiones')
      .select('id')
      .eq('personal_id', persona.id)
      .eq('tipo', 'personal')
      .gte('fecha_revision', startOf(p))

    if (selErr) {
      setErrElim('Error al buscar revisiones: ' + selErr.message)
      setEliminando(false)
      return
    }

    const ids = (revs ?? []).map((r: Record<string, unknown>) => r.id as string)

    if (ids.length === 0) {
      setConfirmElim(null)
      setEliminando(false)
      await Promise.all([cargar(), cargarHistorial()])
      return
    }

    const deletionSet = new Set(ids)

    // 2 — Asignaciones con incidencia en las revisiones a borrar
    const { data: detallesElim } = await supabase
      .from('herramientas_revision_detalle')
      .select('asignacion_id')
      .in('revision_id', ids)
      .in('resultado', ['perdida', 'descuento', 'reponer'])

    const afectadasIds = [...new Set((detallesElim ?? []).map((d: Record<string, unknown>) => d.asignacion_id as string))]

    // 3 — De esas asignaciones, descartar las que aún tienen incidencia en OTRAS revisiones
    let idsParaReset: string[] = afectadasIds
    if (afectadasIds.length > 0) {
      const { data: detallesRest } = await supabase
        .from('herramientas_revision_detalle')
        .select('asignacion_id, revision_id')
        .in('asignacion_id', afectadasIds)
        .in('resultado', ['perdida', 'descuento', 'reponer'])

      const enOtrasRev = new Set(
        (detallesRest ?? [])
          .filter((d: Record<string, unknown>) => !deletionSet.has(d.revision_id as string))
          .map((d: Record<string, unknown>) => d.asignacion_id as string)
      )
      idsParaReset = afectadasIds.filter(id => !enOtrasRev.has(id))
    }

    // 4 — Resetear asignaciones a 'asignada' y borrar de herramientas_perdidas
    if (idsParaReset.length > 0) {
      const { error: updErr } = await supabase
        .from('herramientas_asignaciones')
        .update({ estado: 'asignada' })
        .in('id', idsParaReset)
      if (updErr) {
        setErrElim('Error al actualizar asignaciones: ' + updErr.message)
        setEliminando(false)
        return
      }
      await supabase.from('herramientas_perdidas').delete().in('asignacion_id', idsParaReset)
    }

    // 5 — Borrar detalle y revisiones
    const { error: detErr } = await supabase
      .from('herramientas_revision_detalle')
      .delete()
      .in('revision_id', ids)

    if (detErr) {
      setErrElim('Error al eliminar detalles: ' + detErr.message)
      setEliminando(false)
      return
    }

    const { error: revErr } = await supabase
      .from('herramientas_revisiones')
      .delete()
      .in('id', ids)

    if (revErr) {
      setErrElim('Error al eliminar revisiones: ' + revErr.message)
      setEliminando(false)
      return
    }

    setConfirmElim(null)
    setEliminando(false)
    onRefresh?.()
    await Promise.all([cargar(), cargarHistorial()])
  }

  const incPerdidas   = asignaciones.filter(a => a.estado === 'perdida')
  const incDescuentos = asignaciones.filter(a => a.estado === 'descuento')
  const incReponer    = asignaciones.filter(a => a.estado === 'reponer')

  const totalDescuentosMes = incDescuentos
    .filter(a => a.fecha_reporte && a.fecha_reporte >= mesStr())
    .reduce((acc, a) => acc + a.monto_descuento, 0)

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

  const hoy = new Date().toISOString().split('T')[0]

  // ── PDF por categoría ────────────────────────────────────────────────────────
  function generarPDFCategoria(cat: Categoria) {
    const p = periodos[cat]
    const items = listaFiltradaDe(cat)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${CAT_LABELS[cat]} — ${persona.nombre}</title>
<style>
body{font-family:Arial,sans-serif;padding:2rem;color:#111;max-width:700px;margin:0 auto}
h1{color:#7C3AED;margin-bottom:0.25rem}
h2{color:#374151;font-size:1rem;border-bottom:2px solid #E5E7EB;padding-bottom:0.4rem;margin-top:1.5rem}
table{width:100%;border-collapse:collapse;font-size:0.85rem;margin-top:0.5rem}
th{background:#F9FAFB;text-align:left;padding:0.5rem;border:1px solid #E5E7EB;font-weight:600}
td{padding:0.5rem;border:1px solid #E5E7EB}
.pie{margin-top:2rem;font-size:0.75rem;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:1rem}
</style></head><body>
<h1>📊 ${CAT_LABELS[cat]} — ${PERIODO_LABELS[p]}</h1>
<p style="color:#6B7280;margin-top:0">Colaborador: <strong>${persona.nombre}</strong> &nbsp;·&nbsp; Sector: <strong>${areaNombre ?? '—'}</strong></p>
<h2>${CAT_LABELS[cat]} · ${PERIODO_LABELS[p]} (${items.length})</h2>
${items.length === 0
  ? '<p style="color:#9CA3AF">Sin registros en este período.</p>'
  : cat === 'descuento'
    ? `<table><tr><th>Herramienta</th><th>Fecha</th><th>Monto</th></tr>
${items.map(a => `<tr><td>${a.nombre}</td><td>${a.fecha_reporte ? formatFechaCorta(a.fecha_reporte) : '—'}</td><td>${formatBs(a.monto_descuento)}</td></tr>`).join('')}</table>`
    : `<table><tr><th>Herramienta</th><th>Fecha</th><th>${cat === 'reponer' ? 'Precio ref.' : 'Estado'}</th></tr>
${items.map(a => `<tr><td>${a.nombre}</td><td>${a.fecha_reporte ? formatFechaCorta(a.fecha_reporte) : '—'}</td><td>${cat === 'reponer' ? formatBs(a.precio ?? 0) : 'Activa'}</td></tr>`).join('')}</table>`}
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
      `${persona.nombre} | ${areaNombre ?? '—'}`,
      '',
      items.length === 0
        ? 'Sin registros en este período.'
        : items.map(a =>
            `• ${a.nombre} — ${a.fecha_reporte ? formatFechaCorta(a.fecha_reporte) : 'Sin fecha'}` +
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

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', padding: '1.25rem 1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div>
              <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem' }}>📊 Reporte — {persona.nombre}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', marginTop: '0.2rem' }}>📍 {areaNombre ?? 'Sin sector'}</div>
            </div>
            <button onClick={onCerrar} style={sBtnX}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Historial de revisiones ── */}
          {historialAbierto && (
            <div style={{ border: '1.5px solid #A78BFA', borderRadius: '12px', padding: '1rem', background: '#FAF5FF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7C3AED' }}>📋 Historial de revisiones</span>
                <button onClick={() => setHistorialAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1rem', padding: '0.125rem 0.25rem', lineHeight: 1 }}>✕</button>
              </div>

              {/* Filtro período */}
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}>
                {(['semana', 'mes', 'anio'] as Periodo[]).map(per => {
                  const activo = periodoHist === per
                  return (
                    <button key={per} onClick={() => setPeriodoHist(per)} style={{
                      flex: 1, padding: '0.375rem 0.25rem', borderRadius: '6px',
                      border: `1px solid ${activo ? '#7C3AED' : '#E5E7EB'}`,
                      background: activo ? '#7C3AED' : 'white',
                      color: activo ? 'white' : '#6B7280',
                      fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer',
                    }}>
                      {PERIODO_LABELS[per]}
                    </button>
                  )
                })}
              </div>

              {cargandoHist ? (
                <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem', padding: '1rem 0', margin: 0 }}>Cargando historial...</p>
              ) : revisiones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.25rem', background: 'white', borderRadius: '8px', border: '1px dashed #DDD6FE' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📭</div>
                  <p style={{ color: '#9CA3AF', fontWeight: '600', margin: 0, fontSize: '0.82rem' }}>Sin revisiones en este período</p>
                </div>
              ) : (() => {
                const puntuales  = revisiones.filter(r => r.dias_retraso === 0).length
                const conRetraso = revisiones.filter(r => r.dias_retraso > 0).length
                const sumRetraso = revisiones.filter(r => r.dias_retraso > 0).reduce((s, r) => s + r.dias_retraso, 0)
                const promRetraso = conRetraso > 0 ? Math.round(sumRetraso / conRetraso) : 0
                const totalPerdidas   = revisiones.reduce((s, r) => s + r.detalles.filter(d => d.resultado === 'perdida').length, 0)
                const totalDescuentos = revisiones.reduce((s, r) => s + r.detalles.filter(d => d.resultado === 'descuento').length, 0)
                const totalReponer    = revisiones.reduce((s, r) => s + r.detalles.filter(d => d.resultado === 'reponer').length, 0)

                const conteoPerds = new Map<string, number>()
                for (const rev of revisiones) {
                  for (const d of rev.detalles.filter(x => x.resultado === 'perdida')) {
                    conteoPerds.set(d.nombre, (conteoPerds.get(d.nombre) ?? 0) + 1)
                  }
                }
                const rankPerds = Array.from(conteoPerds.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)

                return (
                  <>
                    {/* Resumen */}
                    <div style={{ background: 'white', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #DDD6FE' }}>
                      <div style={sTitSec2}>Resumen — {PERIODO_LABELS[periodoHist]}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.375rem', marginTop: '0.5rem' }}>
                        <MiniStat label="Total revs." val={revisiones.length} color="#374151" />
                        <MiniStat label="✅ Puntuales" val={puntuales} color="#059669" />
                        <MiniStat label="⚠️ Retraso" val={conRetraso} color="#DC2626" />
                        <MiniStat label="Pérdidas" val={totalPerdidas} color="#DC2626" />
                        <MiniStat label="Descuentos" val={totalDescuentos} color="#7C3AED" />
                        <MiniStat label="Reponer" val={totalReponer} color="#D97706" />
                      </div>
                      {conRetraso > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6B7280' }}>
                          Promedio retraso: <strong style={{ color: '#DC2626' }}>{promRetraso} día{promRetraso !== 1 ? 's' : ''}</strong>
                        </div>
                      )}
                    </div>

                    {/* Herramientas más perdidas */}
                    {rankPerds.length > 0 && (
                      <div style={{ background: 'white', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #FECACA' }}>
                        <div style={sTitSec2Rojo}>🔧 Herramientas más perdidas</div>
                        {rankPerds.map(([nombre, count], i) => (
                          <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', borderTop: i > 0 ? '1px solid #FEF2F2' : 'none', marginTop: i > 0 ? '0.25rem' : '0.375rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#DC2626', minWidth: '16px' }}>{i + 1}.</span>
                            <span style={{ flex: 1, fontSize: '0.8rem', color: '#374151' }}>{nombre}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#DC2626' }}>{count}×</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Detalle de revisiones */}
                    <div style={sTitSec}>Detalle de revisiones</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.375rem' }}>
                      {revisiones.map(rev => {
                        const puntual   = rev.dias_retraso === 0
                        const perdEnRev = rev.detalles.filter(d => d.resultado === 'perdida')
                        const descEnRev = rev.detalles.filter(d => d.resultado === 'descuento')
                        const repEnRev  = rev.detalles.filter(d => d.resultado === 'reponer')
                        return (
                          <div key={rev.id} style={{ background: 'white', borderRadius: '10px', padding: '0.75rem', border: `1px solid ${puntual ? '#D1FAE5' : '#FECACA'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151' }}>
                                📅 {formatFecha(rev.fecha_revision)}
                              </span>
                              <span style={{
                                fontSize: '0.7rem', fontWeight: '700',
                                padding: '0.15rem 0.5rem', borderRadius: '20px',
                                color: puntual ? '#059669' : '#DC2626',
                                background: puntual ? '#D1FAE5' : '#FEE2E2',
                                whiteSpace: 'nowrap' as const,
                              }}>
                                {puntual ? '✅ Puntual' : `⚠️ ${rev.dias_retraso} día${rev.dias_retraso !== 1 ? 's' : ''} retraso`}
                              </span>
                            </div>
                            {rev.fecha_esperada && (
                              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                                Esperada: {formatFecha(rev.fecha_esperada)}
                              </div>
                            )}
                            {(perdEnRev.length > 0 || descEnRev.length > 0 || repEnRev.length > 0) && (
                              <div style={{ marginTop: '0.375rem', display: 'flex', flexWrap: 'wrap' as const, gap: '0.25rem' }}>
                                {perdEnRev.length > 0 && <span style={{ fontSize: '0.68rem', color: '#DC2626', background: '#FEE2E2', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>⚠️ {perdEnRev.length} pérdida{perdEnRev.length !== 1 ? 's' : ''}</span>}
                                {descEnRev.length > 0 && <span style={{ fontSize: '0.68rem', color: '#7C3AED', background: '#EDE9FE', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>💸 {descEnRev.length} descuento{descEnRev.length !== 1 ? 's' : ''}</span>}
                                {repEnRev.length  > 0 && <span style={{ fontSize: '0.68rem', color: '#D97706', background: '#FEF3C7', padding: '0.1rem 0.4rem', borderRadius: '12px' }}>🔄 {repEnRev.length} reponer</span>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}

              {/* Botones eliminar historial */}
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #DDD6FE' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  Eliminar historial
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {(['semana', 'mes', 'anio'] as Periodo[]).map(per => (
                    <button key={per} onClick={() => setConfirmElim(per)} style={{
                      flex: 1, padding: '0.375rem 0.2rem', borderRadius: '6px',
                      border: '1px solid #FECACA', background: 'white',
                      color: '#DC2626', fontWeight: '600', fontSize: '0.7rem', cursor: 'pointer',
                    }}>
                      🗑️ {PERIODO_LABELS[per]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal confirmación eliminación */}
              {confirmElim !== null && (
                <div style={{ marginTop: '0.75rem', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '10px', padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#DC2626', marginBottom: '0.375rem' }}>
                    ¿Eliminar historial de esta {PERIODO_LABELS[confirmElim].toLowerCase()}?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '0.75rem' }}>
                    Se borrarán las revisiones y su detalle. No se elimina personal ni herramientas.
                  </div>
                  {errElim && (
                    <div style={{ fontSize: '0.75rem', color: '#DC2626', background: '#FEE2E2', borderRadius: '6px', padding: '0.4rem 0.6rem', marginBottom: '0.5rem' }}>
                      ⚠️ {errElim}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setConfirmElim(null); setErrElim('') }} disabled={eliminando} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid #E5E7EB', background: 'white', color: '#374151', fontWeight: '600', fontSize: '0.78rem', cursor: eliminando ? 'default' : 'pointer', opacity: eliminando ? 0.6 : 1 }}>
                      Cancelar
                    </button>
                    <button onClick={() => { if (confirmElim) eliminarHistorial(confirmElim) }} disabled={eliminando} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: 'none', background: '#DC2626', color: 'white', fontWeight: '700', fontSize: '0.78rem', cursor: eliminando ? 'wait' : 'pointer', opacity: eliminando ? 0.7 : 1 }}>
                      {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {cargando ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>Cargando reporte...</p>
          ) : (
            <>
              {/* ── Estado actual: tarjetas clicables ── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <div style={sTitSec}>Estado actual</div>
                  <button
                    onClick={() => setHistorialAbierto(h => !h)}
                    style={{
                      background: historialAbierto ? '#7C3AED' : 'white',
                      border: `1.5px solid ${historialAbierto ? '#7C3AED' : '#DDD6FE'}`,
                      color: historialAbierto ? 'white' : '#7C3AED',
                      borderRadius: '8px', padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
                    }}
                  >
                    📋 Historial
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' }}>
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
                    <span style={{ fontSize: '0.82rem', color: '#5B21B6', fontWeight: '600' }}>💰 Total descuentos este mes</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: c.color }}>{CAT_LABELS[categoriaActiva]}</span>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => generarPDFCategoria(categoriaActiva)} style={sBtnCat(categoriaActiva)}>🖨️ PDF</button>
                        <button onClick={() => compartirWhatsAppCategoria(categoriaActiva)} style={sBtnCat(categoriaActiva)}>📱 WhatsApp</button>
                      </div>
                    </div>

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
                        {lista.map(item => <ItemCard key={item.asignacion_id} item={item} />)}
                      </div>
                    )}
                  </div>
                )
              })()}

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

function MiniStat({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.375rem 0.25rem', background: '#FAFAFA', borderRadius: '6px' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: '800', color }}>{val}</div>
      <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: '0.1rem' }}>{label}</div>
    </div>
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
const sTitSec:     CSSProperties = { fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
const sTitSec2:    CSSProperties = { fontSize: '0.72rem', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
const sTitSec2Rojo: CSSProperties = { fontSize: '0.72rem', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
const sBtnX:       CSSProperties = { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px', padding: '0.375rem 0.5rem', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }

const sBtnSec:     CSSProperties = { background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', width: '100%' }
