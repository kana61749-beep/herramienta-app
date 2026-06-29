import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { supabase } from '../../src/lib/supabase'
import type { AreaHerramienta } from '../types'
import ReportePersonal from './ReportePersonal'
import ReporteGeneral from './ReporteGeneral'

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Turno = 'manana' | 'noche'

const TURNO_LABELS: Record<Turno, string> = { manana: '🌅 Mañana', noche: '🌙 Noche' }
const TURNO_SIMPLE: Record<Turno, string> = { manana: 'Mañana', noche: 'Noche' }

interface TurnoStatDetalle {
  personal:     number
  herramientas: number
  perdidas:     number
  solicitudes:  number
}

interface AreaConStats extends AreaHerramienta {
  totalPersonal:     number
  totalHerramientas: number
  totalPerdidas:     number
  totalSolicitudes:  number
  turnoStats: { manana: TurnoStatDetalle; noche: TurnoStatDetalle }
}

interface Colaborador {
  id:                string
  area_id:           string | null
  nombre:            string
  foto_url:          string | null
  activo:            boolean
  created_at:        string
  turno:             Turno
  totalHerramientas: number
  totalPerdidas:     number
  totalSolicitudes:  number
  ultimaRevision:    string | null
  estado:            'sin_novedades' | 'con_faltantes' | 'en_reposicion'
}

type EstadoRevision = 'tiene' | 'perdida' | 'reponer' | 'descuento'

interface HerramientaRevision {
  asignacion_id: string
  item_id:       string
  nombre:        string
  precio:        number | null
  foto_url:      string | null
  estado:        EstadoRevision | null
}

interface AsignacionDetalle {
  asignacion_id: string
  item_id:       string
  nombre:        string
  precio:        number | null
  foto_url:      string | null
  cantidad:      number
}

interface ItemArea {
  id:             string
  nombre:         string
  precio:         number | null
  foto_url:       string | null
  cantidad_total: number
}

interface ConfigRevision {
  dia_revision_personal: number
  hora_inicio_personal:  string | null
  hora_fin_personal:     string | null
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const PALETA = [
  'linear-gradient(135deg, #0D9488, #0F766E)',
  'linear-gradient(135deg, #7C3AED, #6D28D9)',
  'linear-gradient(135deg, #0369A1, #0284C7)',
  'linear-gradient(135deg, #DC2626, #B91C1C)',
  'linear-gradient(135deg, #D97706, #B45309)',
  'linear-gradient(135deg, #059669, #047857)',
]

function gradienteArea(nombre: string) {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return PALETA[Math.abs(h) % PALETA.length]
}

function iniciales(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('')
}

function formatBs(valor: number | null | undefined): string {
  if (valor == null) return 'Bs —'
  return `Bs ${valor.toFixed(2)}`
}

function formatHora(hora: string | null): string {
  if (!hora) return ''
  return hora.slice(0, 5)
}

function formatFechaCorta(iso: string | null): string {
  if (!iso) return 'Sin revisiones'
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcularProximaRevision(cfg: ConfigRevision): { texto: string; esHoy: boolean } {
  const diaJS = cfg.dia_revision_personal === 7 ? 0 : cfg.dia_revision_personal
  const hoy   = new Date()
  let diff    = diaJS - hoy.getDay()
  if (diff < 0) diff += 7
  const esHoy   = diff === 0
  const proxima = new Date(hoy)
  proxima.setDate(hoy.getDate() + diff)
  const s = proxima.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })
  return { texto: s.charAt(0).toUpperCase() + s.slice(1), esHoy }
}

function revisadoHoy(ultimaRevision: string | null): boolean {
  if (!ultimaRevision) return false
  const hoy = new Date().toISOString().split('T')[0]
  return ultimaRevision.split('T')[0] === hoy
}

function calcularRetraso(cfg: ConfigRevision, ultimaRevision: string | null): { diasRetraso: number; fechaEsperada: string } {
  const diaJS = cfg.dia_revision_personal === 7 ? 0 : cfg.dia_revision_personal
  const hoy   = new Date()
  let diasDesde = hoy.getDay() - diaJS
  if (diasDesde < 0) diasDesde += 7
  const esperada = new Date(hoy)
  esperada.setDate(hoy.getDate() - diasDesde)
  const fechaEsperada = esperada.toISOString().split('T')[0]
  if (ultimaRevision) {
    const ultima = new Date(ultimaRevision.split('T')[0])
    if (ultima >= esperada) return { diasRetraso: 0, fechaEsperada }
  }
  return { diasRetraso: diasDesde, fechaEsperada }
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function HerramientasPersonal() {
  const [vista,       setVista]       = useState<'sectores' | 'personal'>('sectores')
  const [areaActiva,  setAreaActiva]  = useState<AreaConStats | null>(null)
  const [turnoActivo, setTurnoActivo] = useState<Turno>('manana')

  const [areas,         setAreas]         = useState<AreaConStats[]>([])
  const [cargandoAreas, setCargandoAreas] = useState(true)

  const [colaboradores,    setColaboradores]    = useState<Colaborador[]>([])
  const [cargandoPersonal, setCargandoPersonal] = useState(false)
  const [configRevision,   setConfigRevision]   = useState<ConfigRevision | null>(null)

  // Modal nuevo colaborador
  const [modalNuevo,    setModalNuevo]    = useState(false)
  const [formNombre,    setFormNombre]    = useState('')
  const [formTurno,     setFormTurno]     = useState<Turno>('manana')
  const [guardandoForm, setGuardandoForm] = useState(false)
  const [errForm,       setErrForm]       = useState('')

  // Modal herramientas
  const [modalHer,   setModalHer]   = useState(false)
  const [personaHer, setPersonaHer] = useState<Colaborador | null>(null)

  // Reportes
  const [reportePersona, setReportePersona] = useState<Colaborador | null>(null)
  const [verReporteGral, setVerReporteGral] = useState(false)

  // Panel revisión
  const [revisar,       setRevisar]       = useState<Colaborador | null>(null)
  const [herRevision,   setHerRevision]   = useState<HerramientaRevision[]>([])
  const [cargandoPanel, setCargandoPanel] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [guardando,     setGuardando]     = useState(false)
  const [guardado,      setGuardado]      = useState(false)
  const [errGuardar,    setErrGuardar]    = useState('')

  useEffect(() => { cargarAreas() }, [])

  // ── Pantalla 1 ─────────────────────────────────────────────────────────────
  async function cargarAreas() {
    setCargandoAreas(true)
    const [areasRes, personalRes] = await Promise.all([
      supabase.from('herramientas_areas').select('*').eq('archivado', false).order('nombre'),
      supabase.from('herramientas_personal').select('id, area_id, turno').eq('activo', true),
    ])

    const areasRaw    = areasRes.data ?? []
    const personalRaw = (personalRes.data ?? []) as { id: string; area_id: string | null; turno: string }[]

    // Maps por persona
    const turnoPorPersona  = new Map<string, Turno>()
    const areaPorPersona   = new Map<string, string>()
    // Sets de personal por área+turno
    const idsPorAreaTurno  = new Map<string, { manana: Set<string>; noche: Set<string> }>()
    const personalPorArea  = new Map<string, number>()

    for (const p of personalRaw) {
      if (!p.area_id) continue
      const t: Turno = p.turno === 'noche' ? 'noche' : 'manana'
      turnoPorPersona.set(p.id, t)
      areaPorPersona.set(p.id, p.area_id)
      personalPorArea.set(p.area_id, (personalPorArea.get(p.area_id) ?? 0) + 1)
      if (!idsPorAreaTurno.has(p.area_id)) idsPorAreaTurno.set(p.area_id, { manana: new Set(), noche: new Set() })
      idsPorAreaTurno.get(p.area_id)![t].add(p.id)
    }

    const herPorPersona   = new Map<string, number>()
    const perdPersonas     = new Set<string>()
    const solicPorPersona = new Map<string, number>()

    if (personalRaw.length > 0) {
      const ids = personalRaw.map(p => p.id)
      const [asigRes, perdRes, solRes] = await Promise.all([
        supabase.from('herramientas_asignaciones').select('personal_id').in('personal_id', ids).is('fecha_devolucion', null),
        supabase.from('herramientas_perdidas').select('personal_id').in('personal_id', ids).eq('estado', 'buscando'),
        supabase.from('herramientas_solicitudes').select('personal_id').in('personal_id', ids).eq('estado', 'pendiente'),
      ])
      for (const a of (asigRes.data ?? []) as { personal_id: string }[])
        herPorPersona.set(a.personal_id, (herPorPersona.get(a.personal_id) ?? 0) + 1)
      for (const p of (perdRes.data ?? []) as { personal_id: string }[])
        perdPersonas.add(p.personal_id)
      for (const s of (solRes.data ?? []) as { personal_id: string }[])
        solicPorPersona.set(s.personal_id, (solicPorPersona.get(s.personal_id) ?? 0) + 1)
    }

    function sumTurno(ids: Set<string>): TurnoStatDetalle {
      let her = 0, perd = 0, solic = 0
      for (const id of ids) {
        her   += herPorPersona.get(id)   ?? 0
        perd  += perdPersonas.has(id)    ? 1 : 0
        solic += solicPorPersona.get(id) ?? 0
      }
      return { personal: ids.size, herramientas: her, perdidas: perd, solicitudes: solic }
    }

    setAreas(areasRaw.map(a => {
      const at = idsPorAreaTurno.get(a.id) ?? { manana: new Set<string>(), noche: new Set<string>() }
      const ms = sumTurno(at.manana), ns = sumTurno(at.noche)
      return {
        ...(a as AreaHerramienta),
        totalPersonal:     personalPorArea.get(a.id) ?? 0,
        totalHerramientas: ms.herramientas + ns.herramientas,
        totalPerdidas:     ms.perdidas     + ns.perdidas,
        totalSolicitudes:  ms.solicitudes  + ns.solicitudes,
        turnoStats: { manana: ms, noche: ns },
      }
    }))
    setCargandoAreas(false)
  }

  // ── Pantalla 2 ─────────────────────────────────────────────────────────────
  async function cargarPersonal(areaId: string, turno: Turno) {
    setCargandoPersonal(true)
    const [personalRes, cfgRes] = await Promise.all([
      supabase.from('herramientas_personal')
        .select('id, area_id, nombre, foto_url, activo, created_at, turno')
        .eq('area_id', areaId)
        .eq('turno', turno)
        .eq('activo', true)
        .order('nombre'),
      supabase.from('herramientas_config_revision').select('dia_revision_personal, hora_inicio_personal, hora_fin_personal').limit(1).maybeSingle(),
    ])

    setConfigRevision(cfgRes.data as ConfigRevision | null)
    const personalRaw = (personalRes.data ?? []) as Omit<Colaborador, 'totalHerramientas' | 'totalPerdidas' | 'totalSolicitudes' | 'ultimaRevision' | 'estado'>[]

    if (personalRaw.length > 0) {
      const ids = personalRaw.map(p => p.id)
      const [asigRes, perdRes, solRes, revRes] = await Promise.all([
        supabase.from('herramientas_asignaciones').select('personal_id, estado').in('personal_id', ids).is('fecha_devolucion', null),
        supabase.from('herramientas_perdidas').select('personal_id').in('personal_id', ids).eq('estado', 'buscando'),
        supabase.from('herramientas_solicitudes').select('personal_id').in('personal_id', ids).eq('estado', 'pendiente'),
        supabase.from('herramientas_revisiones').select('personal_id, fecha_revision').eq('tipo', 'personal').in('personal_id', ids).order('fecha_revision', { ascending: false }),
      ])

      const statsPorPersona = new Map<string, { total: number; perdidas: number; reponer: number }>()
      for (const a of (asigRes.data ?? []) as { personal_id: string; estado: string }[]) {
        const cur = statsPorPersona.get(a.personal_id) ?? { total: 0, perdidas: 0, reponer: 0 }
        statsPorPersona.set(a.personal_id, {
          total:    cur.total + 1,
          perdidas: cur.perdidas + (a.estado === 'perdida' || a.estado === 'descuento' ? 1 : 0),
          reponer:  cur.reponer  + (a.estado === 'reponer' ? 1 : 0),
        })
      }

      const conPerdidas = new Set((perdRes.data ?? []).map((p: { personal_id: string }) => p.personal_id))

      const solicPorPersona = new Map<string, number>()
      for (const s of (solRes.data ?? []) as { personal_id: string }[]) {
        solicPorPersona.set(s.personal_id, (solicPorPersona.get(s.personal_id) ?? 0) + 1)
      }

      const ultimaRevPorPersona = new Map<string, string>()
      for (const r of (revRes.data ?? []) as { personal_id: string; fecha_revision: string }[]) {
        if (!ultimaRevPorPersona.has(r.personal_id)) {
          ultimaRevPorPersona.set(r.personal_id, r.fecha_revision)
        }
      }

      setColaboradores(personalRaw.map(p => {
        const st = statsPorPersona.get(p.id) ?? { total: 0, perdidas: 0, reponer: 0 }
        const estado: Colaborador['estado'] =
          conPerdidas.has(p.id) || st.perdidas > 0 ? 'con_faltantes' :
          st.reponer > 0 ? 'en_reposicion' : 'sin_novedades'
        return {
          ...p,
          totalHerramientas: st.total,
          totalPerdidas:     st.perdidas,
          totalSolicitudes:  solicPorPersona.get(p.id)    ?? 0,
          ultimaRevision:    ultimaRevPorPersona.get(p.id) ?? null,
          estado,
        }
      }))
    } else {
      setColaboradores([])
    }
    setCargandoPersonal(false)
  }

  function entrarSector(area: AreaConStats, turno: Turno) {
    setAreaActiva(area); setTurnoActivo(turno); setVista('personal'); cargarPersonal(area.id, turno)
  }
  function volverSectores() {
    setVista('sectores'); setAreaActiva(null); setTurnoActivo('manana'); setColaboradores([]); cerrarPanel()
  }

  // ── Modal nuevo colaborador ─────────────────────────────────────────────────
  async function guardarNuevo() {
    if (!formNombre.trim()) { setErrForm('El nombre es requerido.'); return }
    if (!areaActiva) return
    setGuardandoForm(true); setErrForm('')
    const { error } = await supabase.from('herramientas_personal').insert({
      nombre:  formNombre.trim(),
      area_id: areaActiva.id,
      turno:   formTurno,
    })
    setGuardandoForm(false)
    if (error) { setErrForm('Error: ' + error.message); return }
    setModalNuevo(false); setFormNombre('')
    cargarPersonal(areaActiva.id, turnoActivo); cargarAreas()
  }

  // ── Panel revisión ──────────────────────────────────────────────────────────
  async function cargarAsignaciones(personalId: string) {
    setCargandoPanel(true)
    const [asigRes, revRes] = await Promise.all([
      supabase.from('herramientas_asignaciones')
        .select('id, item_id, herramientas_items(nombre, precio, foto_url)')
        .eq('personal_id', personalId)
        .is('fecha_devolucion', null)
        .order('fecha_asignacion', { ascending: false }),
      supabase.from('herramientas_revisiones')
        .select('id')
        .eq('personal_id', personalId)
        .eq('tipo', 'personal')
        .order('fecha_revision', { ascending: false })
        .limit(1),
    ])

    const ultimaRev: Record<string, EstadoRevision> = {}
    const revRows = (revRes.data ?? []) as { id: string }[]
    if (revRows.length > 0) {
      const { data: det } = await supabase
        .from('herramientas_revision_detalle')
        .select('asignacion_id, resultado')
        .eq('revision_id', revRows[0].id)
      for (const d of (det ?? []) as { asignacion_id: string; resultado: string }[]) {
        ultimaRev[d.asignacion_id] = d.resultado as EstadoRevision
      }
    }

    setHerRevision(
      ((asigRes.data ?? []) as Record<string, unknown>[]).map(r => {
        const item = r.herramientas_items as { nombre: string; precio: number | null; foto_url: string | null } | null
        return {
          asignacion_id: r.id as string,
          item_id:       r.item_id as string,
          nombre:        item?.nombre ?? 'Herramienta',
          precio:        item?.precio ?? null,
          foto_url:      item?.foto_url ?? null,
          estado:        ultimaRev[r.id as string] ?? null,
        }
      })
    )
    setCargandoPanel(false)
  }

  function abrirPanel(c: Colaborador) {
    setRevisar(c); setObservaciones(''); setGuardado(false); setErrGuardar('')
    cargarAsignaciones(c.id)
  }
  function cerrarPanel() {
    setRevisar(null); setHerRevision([]); setObservaciones(''); setGuardado(false); setErrGuardar('')
  }
  function cambiarEstado(asignacion_id: string, estado: EstadoRevision) {
    setHerRevision(prev => prev.map(h =>
      h.asignacion_id === asignacion_id ? { ...h, estado: h.estado === estado ? null : estado } : h
    ))
  }

  async function guardarRevision() {
    if (!revisar) return
    setGuardando(true); setErrGuardar('')

    const hoy    = new Date().toISOString().split('T')[0]
    const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Calcular retraso respecto al día configurado
    const { diasRetraso, fechaEsperada } = configRevision
      ? calcularRetraso(configRevision, revisar.ultimaRevision)
      : { diasRetraso: 0, fechaEsperada: hoy }

    const { data: existRevs } = await supabase
      .from('herramientas_revisiones')
      .select('id')
      .eq('personal_id', revisar.id)
      .eq('tipo', 'personal')
      .gte('fecha_revision', hoy)
      .lt('fecha_revision', manana)
      .limit(1)

    let revisionId: string

    if (existRevs && existRevs.length > 0) {
      revisionId = (existRevs[0] as { id: string }).id
      await Promise.all([
        supabase.from('herramientas_revisiones').update({
          observaciones:  observaciones || null,
          dias_retraso:   diasRetraso,
          fecha_esperada: fechaEsperada,
        }).eq('id', revisionId),
        supabase.from('herramientas_revision_detalle').delete().eq('revision_id', revisionId),
      ])
    } else {
      const { data: revData, error: revErr } = await supabase
        .from('herramientas_revisiones')
        .insert({
          tipo:           'personal',
          personal_id:    revisar.id,
          revisado_por:   'Admin',
          observaciones:  observaciones || null,
          dias_retraso:   diasRetraso,
          fecha_esperada: fechaEsperada,
        })
        .select('id')
        .single()
      if (revErr || !revData) {
        setErrGuardar('Error al guardar: ' + (revErr?.message ?? 'sin respuesta'))
        setGuardando(false); return
      }
      revisionId = (revData as { id: string }).id
    }

    const marcadas = herRevision.filter(h => h.estado !== null)

    if (marcadas.length > 0) {
      await supabase.from('herramientas_revision_detalle').insert(
        marcadas.map(h => ({ revision_id: revisionId, asignacion_id: h.asignacion_id, resultado: h.estado! }))
      )

      for (const h of marcadas) {
        if (h.estado === 'tiene') {
          await supabase.from('herramientas_asignaciones').update({ estado: 'asignada' }).eq('id', h.asignacion_id)
          continue
        }
        const estadoAsig = h.estado === 'reponer' ? 'reponer' : h.estado === 'descuento' ? 'descuento' : 'perdida'
        await supabase.from('herramientas_asignaciones').update({ estado: estadoAsig }).eq('id', h.asignacion_id)

        if (h.estado === 'perdida' || h.estado === 'descuento') {
          const { data: existPerd } = await supabase
            .from('herramientas_perdidas')
            .select('id')
            .eq('asignacion_id', h.asignacion_id)
            .eq('estado', 'buscando')
            .limit(1)

          if (!existPerd || existPerd.length === 0) {
            await supabase.from('herramientas_perdidas').insert({
              asignacion_id:     h.asignacion_id,
              personal_id:       revisar.id,
              item_id:           h.item_id,
              fecha_reporte:     hoy,
              semana_busqueda:   1,
              estado:            'buscando',
              precio_al_momento: h.precio ?? 0,
              cantidad_perdida:  1,
              monto_descuento:   h.precio ?? 0,
            })
          }
        }
      }
    }

    setGuardando(false); setGuardado(true)
    setTimeout(() => {
      cerrarPanel()
      if (areaActiva) { cargarPersonal(areaActiva.id, turnoActivo); cargarAreas() }
    }, 1500)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const areaNombreTurno = areaActiva ? `${areaActiva.nombre} — ${TURNO_SIMPLE[turnoActivo]}` : null

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`
        .her-input:focus { border-color: #0D9488 !important; outline: none; box-shadow: 0 0 0 3px rgba(13,148,136,0.12); }
        .area-card { transition: box-shadow 0.18s, transform 0.18s; }
        .area-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.13) !important; transform: translateY(-2px); }
        .col-card { transition: box-shadow 0.15s, transform 0.15s; }
        .col-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important; transform: translateY(-1px); }
        .action-btn { transition: opacity 0.15s, transform 0.15s; }
        .action-btn:not(:disabled):hover { opacity: 0.82; transform: translateY(-1px); }
        .rev-tog { transition: all 0.12s; border: 1.5px solid; border-radius: 8px; padding: 0.35rem 0.6rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .panel-overlay { animation: panelFade  0.18s ease; }
        .panel-drawer  { animation: panelSlide 0.22s cubic-bezier(0.32,0.72,0,1); }
        .modal-overlay { animation: panelFade  0.15s ease; }
        .modal-box     { animation: scaleIn    0.18s ease; }
        @keyframes panelFade  { from{opacity:0} to{opacity:1} }
        @keyframes panelSlide { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes scaleIn    { from{transform:scale(0.96);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      {vista === 'sectores'
        ? <PantallaSectores areas={areas} cargando={cargandoAreas} onEntrar={entrarSector} />
        : <PantallaPersonal
            area={areaActiva!}
            turno={turnoActivo}
            colaboradores={colaboradores}
            cargando={cargandoPersonal}
            configRevision={configRevision}
            onVolver={volverSectores}
            onAbrirNuevo={() => { setFormNombre(''); setFormTurno(turnoActivo); setErrForm(''); setModalNuevo(true) }}
            onRevisar={abrirPanel}
            onHerramientas={c => { setPersonaHer(c); setModalHer(true) }}
            onReporte={c => setReportePersona(c)}
            onReporteGeneral={() => setVerReporteGral(true)}
          />
      }

      {/* Modal nuevo colaborador */}
      {modalNuevo && (
        <>
          <div className="modal-overlay" onClick={() => setModalNuevo(false)} style={sOverlay} />
          <div className="modal-box" style={sModalBox}>
            <div style={sModalHdr}>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>👩‍💼 Añadir personal</span>
              <button onClick={() => setModalNuevo(false)} style={sBtnX}>✕</button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
                Sector: <strong style={{ color: '#111827' }}>{areaActiva?.nombre}</strong>
              </p>
              <div>
                <label style={sLabel}>Nombre completo <span style={{ color: '#DC2626' }}>*</span></label>
                <input className="her-input" value={formNombre} onChange={e => setFormNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardarNuevo()} placeholder="Ej: María García" style={sInput} autoFocus />
              </div>
              <div>
                <label style={sLabel}>Turno <span style={{ color: '#DC2626' }}>*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['manana', 'noche'] as Turno[]).map(t => (
                    <button key={t} type="button" onClick={() => setFormTurno(t)} style={{
                      flex: 1, padding: '0.5rem', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer',
                      border: `1.5px solid ${formTurno === t ? '#0D9488' : '#E5E7EB'}`,
                      background: formTurno === t ? '#F0FDFA' : 'white',
                      color: formTurno === t ? '#0D9488' : '#6B7280',
                      fontWeight: formTurno === t ? '700' : '500',
                    }}>
                      {TURNO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              {errForm && <p style={sErrMsg}>⚠️ {errForm}</p>}
            </div>
            <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setModalNuevo(false)} style={{ ...sBtnSec, flexShrink: 0 }}>Cancelar</button>
              <button onClick={guardarNuevo} disabled={guardandoForm} style={{ flex: 1, ...sBtnPrim, opacity: guardandoForm ? 0.7 : 1 }}>
                {guardandoForm ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal herramientas */}
      {modalHer && personaHer && areaActiva && (
        <ModalHerramientas
          persona={personaHer}
          areaId={areaActiva.id}
          onCerrar={() => setModalHer(false)}
          onRefresh={() => { cargarPersonal(areaActiva.id, turnoActivo); cargarAreas() }}
        />
      )}

      {/* Reporte personal */}
      {reportePersona && (
        <ReportePersonal
          persona={reportePersona}
          areaNombre={areaNombreTurno}
          onCerrar={() => setReportePersona(null)}
        />
      )}

      {/* Reporte general del sector/turno */}
      {verReporteGral && areaActiva && (
        <ReporteGeneral
          area={{ id: areaActiva.id, nombre: areaNombreTurno ?? areaActiva.nombre }}
          personalIds={colaboradores.map(c => c.id)}
          colaboradores={colaboradores.map(c => ({ id: c.id, nombre: c.nombre }))}
          onCerrar={() => setVerReporteGral(false)}
        />
      )}

      {/* Panel revisión */}
      {revisar && (
        <PanelRevisar
          colaborador={revisar}
          areaNombre={areaNombreTurno}
          configRevision={configRevision}
          herramientas={herRevision}
          cargandoPanel={cargandoPanel}
          onEstadoChange={cambiarEstado}
          observaciones={observaciones}
          setObservaciones={setObservaciones}
          guardando={guardando}
          guardado={guardado}
          errGuardar={errGuardar}
          onGuardar={guardarRevision}
          onCerrar={cerrarPanel}
        />
      )}
    </div>
  )
}

// ── Pantalla 1: Sectores ─────────────────────────────────────────────────────
function PantallaSectores({ areas, cargando, onEntrar }: {
  areas: AreaConStats[]; cargando: boolean; onEntrar: (a: AreaConStats, t: Turno) => void
}) {
  const [filtroId,    setFiltroId]    = useState<string | null>(null)   // null = todos
  const [modalOpen,   setModalOpen]   = useState(false)

  const sectorActivo  = filtroId ? (areas.find(a => a.id === filtroId) ?? null) : null
  const labelFiltro   = sectorActivo?.nombre ?? 'Todos los sectores'
  const totalPersonas = areas.reduce((s, a) => s + a.totalPersonal, 0)

  function seleccionar(id: string | null) { setFiltroId(id); setModalOpen(false) }

  return (
    <div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
          👥 Herramientas Personal
        </h1>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#9CA3AF' }}>
          Gestión de personal por sector y turno
        </p>
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #E5E7EB', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <p style={{ color: '#9CA3AF', marginTop: '1rem', fontSize: '0.875rem' }}>Cargando sectores...</p>
        </div>
      ) : areas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '16px', border: '1.5px dashed #E5E7EB' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
          <p style={{ color: '#374151', fontWeight: '700', margin: '0 0 0.4rem' }}>No hay sectores creados</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Primero crea un área en la sección de Áreas.</p>
        </div>
      ) : (
        <>
          {/* ── Botón selector de sector ── */}
          <button onClick={() => setModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
            padding: '0.875rem 1.125rem', borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
            background: 'white', border: '1.5px solid #E5E7EB',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: sectorActivo ? gradienteArea(sectorActivo.nombre) : 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1rem', flexShrink: 0 }}>
              {sectorActivo ? sectorActivo.nombre.charAt(0).toUpperCase() : '🏢'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>Sector activo</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelFiltro}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
              {sectorActivo && (
                <button onClick={e => { e.stopPropagation(); seleccionar(null) }} style={{ background: '#F3F4F6', border: 'none', borderRadius: '6px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem', color: '#6B7280', fontWeight: '600' }}>
                  Todos
                </button>
              )}
              <span style={{ color: '#9CA3AF', fontSize: '1rem', lineHeight: 1 }}>▾</span>
            </div>
          </button>

          {/* ── Contenido: todos o un sector ── */}
          {filtroId === null ? (
            /* Vista general: tarjeta compacta por sector */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {areas.map(a => <SectorCompacto key={a.id} area={a} onEntrar={onEntrar} />)}
            </div>
          ) : sectorActivo ? (
            /* Vista detallada: un sector con sus dos tarjetas de turno */
            <SectorDetalle area={sectorActivo} onEntrar={onEntrar} />
          ) : null}
        </>
      )}

      {/* ── Modal bottom-sheet selector ── */}
      {modalOpen && (
        <>
          <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '22px 22px 0 0', zIndex: 3001, paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            {/* Handle bar */}
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#E5E7EB', margin: '0.875rem auto 0' }} />
            {/* Sheet header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.375rem 0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#111827' }}>Seleccionar sector</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '1rem', fontWeight: '700' }}>✕</button>
            </div>
            {/* Options list */}
            <div style={{ overflowY: 'auto', padding: '0.5rem 1rem 1.25rem', flex: 1 }}>
              {/* Todos los sectores */}
              <FiltroOpcion
                icono="🏢"
                grad="linear-gradient(135deg,#0D9488,#0F766E)"
                label="Todos los sectores"
                sub={`${totalPersonas} personas en total`}
                seleccionado={!filtroId}
                onClick={() => seleccionar(null)}
              />
              {/* Divisor */}
              <div style={{ height: '1px', background: '#F3F4F6', margin: '0.625rem 0' }} />
              {/* Sectores */}
              {areas.map(a => (
                <FiltroOpcion
                  key={a.id}
                  icono={a.nombre.charAt(0).toUpperCase()}
                  grad={gradienteArea(a.nombre)}
                  label={a.nombre}
                  sub={`${a.totalPersonal} personas · ${a.totalHerramientas} herramientas${a.totalPerdidas > 0 ? ` · ⚠️ ${a.totalPerdidas} pérdidas` : ''}`}
                  seleccionado={filtroId === a.id}
                  alerta={a.totalPerdidas > 0}
                  onClick={() => seleccionar(a.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FiltroOpcion({ icono, grad, label, sub, seleccionado, alerta, onClick }: {
  icono: string; grad: string; label: string; sub: string
  seleccionado: boolean; alerta?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem', width: '100%', textAlign: 'left',
      padding: '0.75rem 0.875rem', borderRadius: '12px', cursor: 'pointer', marginBottom: '0.25rem',
      background: seleccionado ? '#F0FDFA' : 'transparent',
      border: `1.5px solid ${seleccionado ? '#5EEAD4' : 'transparent'}`,
      transition: 'background 0.12s',
    }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1rem', flexShrink: 0 }}>
        {icono}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: seleccionado ? '700' : '600', color: seleccionado ? '#0D9488' : '#111827', fontSize: '0.9rem' }}>{label}</div>
        <div style={{ fontSize: '0.73rem', color: alerta ? '#EF4444' : '#9CA3AF', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      {seleccionado && (
        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: '800' }}>✓</span>
        </div>
      )}
    </button>
  )
}

/* Vista compacta — usada en "Todos los sectores" */
function SectorCompacto({ area, onEntrar }: { area: AreaConStats; onEntrar: (a: AreaConStats, t: Turno) => void }) {
  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #F3F4F6', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      {/* Cabecera del sector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.125rem', borderBottom: '1px solid #F9FAFB' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: gradienteArea(area.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1rem', flexShrink: 0 }}>
          {area.nombre.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.9rem' }}>{area.nombre}</div>
          <div style={{ fontSize: '0.73rem', color: '#9CA3AF' }}>
            👤 {area.totalPersonal} · 🔧 {area.totalHerramientas}
            {area.totalPerdidas > 0 && <span style={{ color: '#DC2626', fontWeight: '600' }}> · ⚠️ {area.totalPerdidas}</span>}
          </div>
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '0.25rem 0.6rem', borderRadius: '20px', background: area.totalPerdidas > 0 ? '#FEE2E2' : '#DCFCE7', color: area.totalPerdidas > 0 ? '#DC2626' : '#16A34A' }}>
          {area.totalPerdidas > 0 ? '⚠️ Faltantes' : '✅ OK'}
        </span>
      </div>
      {/* Fila de turnos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {(['manana', 'noche'] as Turno[]).map((t, i) => {
          const st  = area.turnoStats[t]
          const esM = t === 'manana'
          const clr = esM ? '#0284C7' : '#7C3AED'
          const bg  = esM ? '#EFF6FF'  : '#EDE9FE'
          return (
            <div key={t} style={{ padding: '0.75rem 1rem', borderRight: i === 0 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem' }}>{esM ? '🌅' : '🌙'}</span>
                <span style={{ fontSize: '0.73rem', fontWeight: '700', color: clr }}>Turno {esM ? 'Mañana' : 'Noche'}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                {[
                  { ico: '👤', val: st.personal },
                  { ico: '🔧', val: st.herramientas },
                  { ico: '⚠️', val: st.perdidas },
                ].map(x => (
                  <span key={x.ico} style={{ fontSize: '0.72rem', fontWeight: '600', color: (x.ico === '⚠️' && x.val > 0) ? '#DC2626' : '#6B7280', background: (x.ico === '⚠️' && x.val > 0) ? '#FEE2E2' : bg, padding: '0.2rem 0.45rem', borderRadius: '6px' }}>
                    {x.ico} {x.val}
                  </span>
                ))}
              </div>
              <button onClick={() => onEntrar(area, t)} style={{ width: '100%', background: clr, color: 'white', border: 'none', borderRadius: '8px', padding: '0.45rem 0.5rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                Ingresar →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Vista detallada — usada al seleccionar un sector específico */
function SectorDetalle({ area, onEntrar }: { area: AreaConStats; onEntrar: (a: AreaConStats, t: Turno) => void }) {
  return (
    <div>
      {/* Cabecera del sector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '2px solid #F3F4F6', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: gradienteArea(area.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.1rem', flexShrink: 0 }}>
            {area.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>{area.nombre}</h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#9CA3AF' }}>
              👤 {area.totalPersonal} personas · 🔧 {area.totalHerramientas} herramientas
              {area.totalPerdidas > 0 && <span style={{ color: '#DC2626', fontWeight: '600' }}> · ⚠️ {area.totalPerdidas} pérdidas</span>}
            </p>
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.3rem 0.75rem', borderRadius: '20px', background: area.activo ? '#DCFCE7' : '#F3F4F6', color: area.activo ? '#16A34A' : '#9CA3AF' }}>
          {area.activo ? '● Activo' : '● Inactivo'}
        </span>
      </div>

      {/* Tarjetas de turno */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.125rem' }}>
        {(['manana', 'noche'] as Turno[]).map(turno => {
          const st  = area.turnoStats[turno]
          const esM = turno === 'manana'
          const clr = esM
            ? { grad: 'linear-gradient(135deg,#0369A1,#0284C7)', light: '#EFF6FF' }
            : { grad: 'linear-gradient(135deg,#5B21B6,#7C3AED)', light: '#EDE9FE' }
          const estadoColor = st.perdidas > 0 ? '#DC2626' : st.personal === 0 ? '#9CA3AF' : '#16A34A'
          const estadoLabel = st.perdidas > 0 ? 'Con faltantes' : st.personal === 0 ? 'Sin personal' : 'Sin novedades'
          return (
            <div key={turno} style={{ background: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6' }}>
              <div style={{ background: clr.grad, padding: '1.125rem 1.375rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '2rem', lineHeight: 1 }}>{esM ? '🌅' : '🌙'}</div>
                <div>
                  <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem' }}>Turno {esM ? 'Mañana' : 'Noche'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: '0.15rem' }}>{st.personal} {st.personal === 1 ? 'persona' : 'personas'} registradas</div>
                </div>
              </div>
              <div style={{ padding: '1.125rem 1.375rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
                  {[
                    { label: 'Personal',     val: st.personal,     ico: '👤', al: false },
                    { label: 'Herramientas', val: st.herramientas, ico: '🔧', al: false },
                    { label: 'Pérdidas',     val: st.perdidas,     ico: '⚠️', al: st.perdidas > 0 },
                    { label: 'Solicitudes',  val: st.solicitudes,  ico: '📋', al: false },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.al ? '#FEF2F2' : clr.light, borderRadius: '10px', padding: '0.7rem 0.875rem', border: s.al ? '1px solid #FECACA' : 'none' }}>
                      <div style={{ fontSize: '0.68rem', color: s.al ? '#EF4444' : '#6B7280', fontWeight: '600', marginBottom: '0.25rem' }}>{s.ico} {s.label}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: '800', color: s.al ? '#DC2626' : '#111827', lineHeight: 1 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '0.73rem', fontWeight: '700', color: estadoColor, background: estadoColor + '18', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>● {estadoLabel}</span>
                  {st.solicitudes > 0 && <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#D97706', background: '#FEF3C7', padding: '0.25rem 0.6rem', borderRadius: '20px' }}>📋 {st.solicitudes}</span>}
                </div>
                <button onClick={() => onEntrar(area, turno)} style={{ width: '100%', background: clr.grad, color: 'white', border: 'none', borderRadius: '10px', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  Ingresar al turno →
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Pantalla 2: Personal del sector/turno ─────────────────────────────────────
function PantallaPersonal({ area, turno, colaboradores, cargando, configRevision, onVolver, onAbrirNuevo, onRevisar, onHerramientas, onReporte, onReporteGeneral }: {
  area: AreaConStats; turno: Turno; colaboradores: Colaborador[]; cargando: boolean
  configRevision: ConfigRevision | null
  onVolver: () => void; onAbrirNuevo: () => void
  onRevisar: (c: Colaborador) => void; onHerramientas: (c: Colaborador) => void
  onReporte: (c: Colaborador) => void; onReporteGeneral: () => void
}) {
  const turnoColor = turno === 'manana' ? '#0284C7' : '#6D28D9'
  const turnoBg    = turno === 'manana' ? '#EFF6FF' : '#EDE9FE'

  // Contar cuántos tienen retraso para mostrarlo en el header
  const conRetraso = configRevision
    ? colaboradores.filter(c => !revisadoHoy(c.ultimaRevision) && calcularRetraso(configRevision, c.ultimaRevision).diasRetraso > 0).length
    : 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
        <button onClick={onVolver} style={{ background: 'white', border: '1.5px solid #E5E7EB', color: '#374151', borderRadius: '8px', padding: '0.375rem 0.75rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
          ← Sectores
        </button>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>👥 Herramientas Personal</span>
          <span style={{ color: '#D1D5DB' }}>—</span>
          <span style={{ background: gradienteArea(area.nombre), WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{area.nombre}</span>
          <span style={{ color: '#D1D5DB' }}>—</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: turnoColor, background: turnoBg, padding: '0.2rem 0.6rem', borderRadius: '20px' }}>{TURNO_LABELS[turno]}</span>
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>
            {cargando ? 'Cargando...' : `${colaboradores.length} ${colaboradores.length === 1 ? 'colaborador' : 'colaboradores'} — turno ${TURNO_SIMPLE[turno].toLowerCase()}`}
          </p>
          {!cargando && conRetraso > 0 && (
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#DC2626', background: '#FEE2E2', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
              ⏰ {conRetraso} con retraso
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onReporteGeneral} style={{ ...sBtnSec, fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>📊 Reporte general</button>
          <button onClick={onAbrirNuevo} style={sBtnPrim}>+ Añadir personal</button>
        </div>
      </div>
      {cargando ? (
        <p style={{ textAlign: 'center', padding: '3rem 0', color: '#9CA3AF' }}>Cargando personal...</p>
      ) : colaboradores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '14px', border: '1.5px dashed #E5E7EB' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👤</div>
          <p style={{ color: '#374151', fontWeight: '600', margin: '0 0 0.5rem' }}>No hay personal en el turno {TURNO_SIMPLE[turno].toLowerCase()}</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Usa "+ Añadir personal" para registrar colaboradores.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {colaboradores.map(c => (
            <ColaboradorCard key={c.id} colaborador={c} configRevision={configRevision} onRevisar={() => onRevisar(c)} onHerramientas={() => onHerramientas(c)} onReporte={() => onReporte(c)} />
          ))}
        </div>
      )}
    </>
  )
}

function ColaboradorCard({ colaborador: c, configRevision, onRevisar, onHerramientas, onReporte }: {
  colaborador: Colaborador; configRevision: ConfigRevision | null
  onRevisar: () => void; onHerramientas: () => void; onReporte: () => void
}) {
  const estadoColor = c.estado === 'con_faltantes' ? '#DC2626' : c.estado === 'en_reposicion' ? '#D97706' : c.totalHerramientas === 0 ? '#9CA3AF' : '#16A34A'
  const estadoLabel = c.estado === 'con_faltantes' ? 'Con faltantes' : c.estado === 'en_reposicion' ? 'En reposición' : c.totalHerramientas === 0 ? 'Sin herramientas' : 'Sin novedades'
  const yaRevisado  = revisadoHoy(c.ultimaRevision)
  const { diasRetraso } = configRevision && !yaRevisado
    ? calcularRetraso(configRevision, c.ultimaRevision)
    : { diasRetraso: 0 }
  const tieneRetraso = diasRetraso > 0

  return (
    <div className="col-card" style={{ background: 'white', border: `1.5px solid ${tieneRetraso ? '#FECACA' : '#E5E7EB'}`, borderRadius: '14px', padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '0.95rem', overflow: 'hidden' }}>
          {c.foto_url ? <img src={c.foto_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : iniciales(c.nombre)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>🔧 {c.totalHerramientas} herramientas</span>
            {c.totalPerdidas > 0 && <span style={{ fontSize: '0.7rem', color: '#DC2626' }}>⚠️ {c.totalPerdidas} pérd.</span>}
            {c.totalSolicitudes > 0 && <span style={{ fontSize: '0.7rem', color: '#D97706' }}>📋 {c.totalSolicitudes} sol.</span>}
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: estadoColor, background: estadoColor + '18', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>● {estadoLabel}</span>
          </div>
          <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
            {yaRevisado ? (
              <span style={{ color: '#16A34A', fontWeight: '600' }}>✅ Revisado hoy</span>
            ) : tieneRetraso ? (
              <span style={{ color: '#DC2626', fontWeight: '700' }}>
                ⏰ {diasRetraso} día{diasRetraso > 1 ? 's' : ''} de retraso — última revisión: {formatFechaCorta(c.ultimaRevision)}
              </span>
            ) : (
              <span style={{ color: '#9CA3AF' }}>📅 Última revisión: {formatFechaCorta(c.ultimaRevision)}</span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <BtnAccion label={yaRevisado ? '✅ Revisado' : tieneRetraso ? `⏰ Revisar` : 'Revisar'} color={yaRevisado ? '#16A34A' : tieneRetraso ? '#DC2626' : '#0D9488'} onClick={onRevisar} />
        <BtnAccion label="+ Herramientas" color="#7C3AED" onClick={onHerramientas} />
        <BtnAccion label="📊 Reporte" color="#6D28D9" onClick={onReporte} />
      </div>
    </div>
  )
}

function BtnAccion({ label, color, onClick, disabled }: { label: string; color: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="action-btn" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ background: disabled ? '#F3F4F6' : color + '12', border: `1.5px solid ${disabled ? '#E5E7EB' : color + '40'}`, color: disabled ? '#9CA3AF' : color, borderRadius: '8px', padding: '0.4rem 0.25rem', fontSize: '0.72rem', fontWeight: '700', cursor: disabled ? 'default' : 'pointer', textAlign: 'center', lineHeight: 1.3 }}>
      {label}
    </button>
  )
}

// ── Modal Herramientas (self-contained) ───────────────────────────────────────
function ModalHerramientas({ persona, areaId, onCerrar, onRefresh }: {
  persona: Colaborador; areaId: string; onCerrar: () => void; onRefresh: () => void
}) {
  const [asignaciones, setAsignaciones] = useState<AsignacionDetalle[]>([])
  const [items,        setItems]        = useState<ItemArea[]>([])
  const [cargando,     setCargando]     = useState(true)

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editCant,   setEditCant]   = useState(1)
  const [guardEdit,  setGuardEdit]  = useState(false)

  const [verFormItem, setVerFormItem] = useState(false)
  const [fNombre,     setFNombre]     = useState('')
  const [fFotoB64,    setFFotoB64]    = useState<string | null>(null)
  const [fPrecio,     setFPrecio]     = useState('')
  const [fCantidad,   setFCantidad]   = useState(1)
  const [creandoItem, setCreandoItem] = useState(false)
  const [errItem,     setErrItem]     = useState('')

  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [asigRes, itemsRes] = await Promise.all([
      supabase.from('herramientas_asignaciones')
        .select('id, item_id, cantidad, herramientas_items(nombre, precio, foto_url)')
        .eq('personal_id', persona.id)
        .is('fecha_devolucion', null)
        .order('fecha_asignacion', { ascending: false }),
      supabase.from('herramientas_items')
        .select('id, nombre, precio, foto_url, cantidad_total')
        .eq('area_id', areaId)
        .eq('tipo', 'area')
        .order('nombre'),
    ])
    setAsignaciones(
      ((asigRes.data ?? []) as Record<string, unknown>[]).map(r => {
        const it = r.herramientas_items as { nombre: string; precio: number | null; foto_url: string | null } | null
        return { asignacion_id: r.id as string, item_id: r.item_id as string, nombre: it?.nombre ?? 'Herramienta', precio: it?.precio ?? null, foto_url: it?.foto_url ?? null, cantidad: r.cantidad as number }
      })
    )
    setItems(
      ((itemsRes.data ?? []) as Record<string, unknown>[]).map(r => ({
        id: r.id as string, nombre: r.nombre as string, precio: r.precio as number | null, foto_url: r.foto_url as string | null, cantidad_total: r.cantidad_total as number,
      }))
    )
    setCargando(false)
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFFotoB64(ev.target?.result as string ?? null)
    reader.readAsDataURL(file)
  }

  function resetFormItem() {
    setFNombre(''); setFFotoB64(null); setFPrecio(''); setFCantidad(1); setErrItem('')
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  async function eliminarAsig(id: string) {
    const hoy = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('herramientas_asignaciones').update({ fecha_devolucion: hoy, estado: 'devuelta' }).eq('id', id)
    if (!error) { await cargar(); onRefresh() }
  }

  async function guardarEdit(id: string) {
    setGuardEdit(true)
    const { error } = await supabase.from('herramientas_asignaciones').update({ cantidad: editCant }).eq('id', id)
    setGuardEdit(false)
    if (!error) { setAsignaciones(prev => prev.map(a => a.asignacion_id === id ? { ...a, cantidad: editCant } : a)); setEditandoId(null) }
  }

  async function crearItem() {
    if (!fNombre.trim()) { setErrItem('El nombre es requerido.'); return }
    const precio = fPrecio ? parseFloat(fPrecio) : null
    if (fPrecio && (isNaN(precio!) || precio! < 0)) { setErrItem('Precio inválido.'); return }
    setCreandoItem(true); setErrItem('')

    const payloadItem = { tipo: 'area', area_id: areaId, nombre: fNombre.trim(), descripcion: null, foto_url: fFotoB64 ?? null, cantidad_total: fCantidad, precio, moneda: 'BOB', estado: 'completa' }
    const { data: ni, error: errItem_ } = await supabase.from('herramientas_items')
      .insert(payloadItem)
      .select('id, nombre, precio, foto_url, cantidad_total').single()

    setCreandoItem(false)
    if (errItem_ || !ni) { setErrItem('Error al crear: ' + (errItem_?.message ?? 'sin datos')); return }
    const newIt = ni as { id: string; nombre: string; precio: number | null; foto_url: string | null; cantidad_total: number }

    const hoy = new Date().toISOString().split('T')[0]
    const payloadAsig = { personal_id: persona.id, item_id: newIt.id, fecha_asignacion: hoy, cantidad: fCantidad }
    const { error: errAsig_ } = await supabase.from('herramientas_asignaciones')
      .insert(payloadAsig)
      .select('id').single()

    if (errAsig_) { setErrItem('Herramienta creada pero error al asignar: ' + errAsig_.message); await cargar(); onRefresh(); setVerFormItem(false); resetFormItem(); return }

    setVerFormItem(false); resetFormItem()
    await cargar(); onRefresh()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} style={{ ...sOverlay, zIndex: 2200 }} />
      <div className="modal-box" style={{ ...sModalBox, zIndex: 2201, width: 'min(560px, calc(100vw - 2rem))', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={sModalHdr}>
          <div>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>🔧 Herramientas — {persona.nombre}</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: '0.15rem' }}>{asignaciones.length} herramientas asignadas</div>
          </div>
          <button onClick={onCerrar} style={sBtnX}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div>
            <div style={sTitSec}>Herramientas asignadas</div>
            {cargando ? (
              <p style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: '0.5rem' }}>Cargando...</p>
            ) : asignaciones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.25rem', background: '#F9FAFB', borderRadius: '10px', border: '1.5px dashed #E5E7EB', marginTop: '0.625rem' }}>
                <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>No hay herramientas asignadas todavía.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.625rem' }}>
                {asignaciones.map(a => (
                  <div key={a.asignacion_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', border: '1px solid #E5E7EB', borderRadius: '10px', background: 'white' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F0FDFA', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      {a.foto_url ? <img src={a.foto_url} alt={a.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🔧'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>{formatBs(a.precio)}</span>
                        <span>·</span>
                        <span>Cant: {editandoId === a.asignacion_id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input type="number" min={1} value={editCant} onChange={e => setEditCant(Math.max(1, parseInt(e.target.value) || 1))}
                              style={{ width: '50px', padding: '0.1rem 0.3rem', border: '1px solid #0D9488', borderRadius: '4px', fontSize: '0.75rem' }} />
                            <button onClick={() => guardarEdit(a.asignacion_id)} disabled={guardEdit}
                              style={{ background: '#0D9488', color: 'white', border: 'none', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                              {guardEdit ? '...' : '✓'}
                            </button>
                            <button onClick={() => setEditandoId(null)}
                              style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.7rem', cursor: 'pointer' }}>✕</button>
                          </span>
                        ) : a.cantidad}</span>
                      </div>
                    </div>
                    {editandoId !== a.asignacion_id && (
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        <button onClick={() => { setEditandoId(a.asignacion_id); setEditCant(a.cantidad) }}
                          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', borderRadius: '6px', padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>
                          Editar
                        </button>
                        <button onClick={() => eliminarAsig(a.asignacion_id)}
                          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '6px', padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer' }}>
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
            <div style={sTitSec}>Añadir herramienta</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              {!verFormItem && (
                <>
                  {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#FFF7ED', borderRadius: '10px', border: '1.5px dashed #FED7AA' }}>
                      <p style={{ color: '#92400E', fontSize: '0.82rem', margin: '0 0 0.5rem' }}>No hay herramientas creadas en este sector.</p>
                      <button onClick={() => setVerFormItem(true)} style={{ ...sBtnPrim, fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>+ Crear herramienta</button>
                    </div>
                  ) : (
                    <button onClick={() => setVerFormItem(true)} style={{ ...sBtnSec, fontSize: '0.8rem', padding: '0.45rem 0.75rem', alignSelf: 'flex-start' }}>+ Nueva herramienta</button>
                  )}
                </>
              )}

              {verFormItem && (
                <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '1.125rem', border: '1.5px solid #E5E7EB' }}>
                  <div style={{ ...sTitSec, marginBottom: '1rem' }}>Nueva herramienta en el sector</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={sLabel}>Foto</label>
                      <input ref={fotoInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button type="button" onClick={() => fotoInputRef.current?.click()}
                          style={{ ...sBtnSec, fontSize: '0.8rem', padding: '0.45rem 0.875rem', whiteSpace: 'nowrap' }}>
                          📷 {fFotoB64 ? 'Cambiar foto' : 'Seleccionar foto'}
                        </button>
                        {fFotoB64 && (
                          <>
                            <img src={fFotoB64} alt="Preview" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #E5E7EB', flexShrink: 0 }} />
                            <button type="button" onClick={() => { setFFotoB64(null); if (fotoInputRef.current) fotoInputRef.current.value = '' }}
                              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem' }}>
                              ✕ Quitar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={sLabel}>Nombre <span style={{ color: '#DC2626' }}>*</span></label>
                      <input className="her-input" value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Ej: Caja registradora" style={sInput} autoFocus />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div>
                        <label style={sLabel}>Precio (Bs)</label>
                        <input className="her-input" type="number" min={0} step="0.01" value={fPrecio} onChange={e => setFPrecio(e.target.value)} placeholder="0.00" style={sInput} />
                      </div>
                      <div>
                        <label style={sLabel}>Cantidad</label>
                        <input className="her-input" type="number" min={1} value={fCantidad} onChange={e => setFCantidad(Math.max(1, parseInt(e.target.value) || 1))} style={sInput} />
                      </div>
                    </div>
                    {errItem && <p style={sErrMsg}>⚠️ {errItem}</p>}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setVerFormItem(false); resetFormItem() }} style={{ ...sBtnSec, flexShrink: 0 }}>Cancelar</button>
                      <button onClick={crearItem} disabled={creandoItem} style={{ flex: 1, ...sBtnPrim, opacity: creandoItem ? 0.7 : 1 }}>
                        {creandoItem ? 'Creando...' : 'Crear y seleccionar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
          <button onClick={onCerrar} style={{ ...sBtnSec, width: '100%' }}>Cerrar</button>
        </div>
      </div>
    </>
  )
}

// ── Panel Revisión ────────────────────────────────────────────────────────────
interface PanelProps {
  colaborador:      Colaborador
  areaNombre:       string | null
  configRevision:   ConfigRevision | null
  herramientas:     HerramientaRevision[]
  cargandoPanel:    boolean
  onEstadoChange:   (id: string, estado: EstadoRevision) => void
  observaciones:    string
  setObservaciones: (v: string) => void
  guardando:        boolean
  guardado:         boolean
  errGuardar:       string
  onGuardar:        () => void
  onCerrar:         () => void
}

function PanelRevisar({ colaborador: c, areaNombre, configRevision, herramientas, cargandoPanel, onEstadoChange, observaciones, setObservaciones, guardando, guardado, errGuardar, onGuardar, onCerrar }: PanelProps) {
  const perdidas      = herramientas.filter(h => h.estado === 'perdida').length
  const reponer       = herramientas.filter(h => h.estado === 'reponer').length
  const descuento     = herramientas.filter(h => h.estado === 'descuento').length
  const revResult     = configRevision ? calcularProximaRevision(configRevision) : null
  const yaRevisadoHoy = revisadoHoy(c.ultimaRevision)
  const { diasRetraso, fechaEsperada } = configRevision && !yaRevisadoHoy
    ? calcularRetraso(configRevision, c.ultimaRevision)
    : { diasRetraso: 0, fechaEsperada: new Date().toISOString().split('T')[0] }
  const tieneRetraso = diasRetraso > 0

  return (
    <>
      <div className="panel-overlay" onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, backdropFilter: 'blur(2px)' }} />
      <div className="panel-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(500px,100vw)', background: 'white', zIndex: 2001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>

        <div style={{ background: tieneRetraso ? 'linear-gradient(135deg,#DC2626,#B91C1C)' : 'linear-gradient(135deg,#0D9488,#0F766E)', padding: '1.25rem 1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.1rem', overflow: 'hidden' }}>
                {c.foto_url ? <img src={c.foto_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : iniciales(c.nombre)}
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem' }}>{c.nombre}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', marginTop: '0.15rem' }}>📍 {areaNombre ?? 'Sin sector'}</div>
                <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                  {yaRevisadoHoy ? (
                    <span style={{ color: '#DCFCE7', fontWeight: '700' }}>✅ Revisado hoy</span>
                  ) : tieneRetraso ? (
                    <span style={{ color: '#FCA5A5', fontWeight: '700' }}>
                      ⏰ {diasRetraso} día{diasRetraso > 1 ? 's' : ''} de retraso · debía revisarse el {new Date(fechaEsperada + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  ) : revResult ? (
                    revResult.esHoy ? (
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                        📅 Hoy
                        {configRevision?.hora_inicio_personal && ` · ${formatHora(configRevision.hora_inicio_personal)}`}
                        {configRevision?.hora_fin_personal    && ` – ${formatHora(configRevision.hora_fin_personal)}`}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                        📅 Próxima: {revResult.texto}
                        {configRevision?.hora_inicio_personal && ` · ${formatHora(configRevision.hora_inicio_personal)}`}
                        {configRevision?.hora_fin_personal    && ` – ${formatHora(configRevision.hora_fin_personal)}`}
                      </span>
                    )
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.55)' }}>⚙️ Sin horario · Ve a Configuración</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onCerrar} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '8px', padding: '0.375rem 0.5rem', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
          {tieneRetraso && (
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '0.5rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
              ℹ️ Al guardar esta revisión se registrarán <strong>{diasRetraso} día{diasRetraso > 1 ? 's' : ''} de retraso</strong> en el historial.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '0.625rem 0.75rem' }}>
            {[
              { v: herramientas.length, l: 'Total' },
              { v: perdidas,            l: 'Perdidas' },
              { v: reponer,             l: 'Reponer' },
              { v: descuento,           l: 'Descuento' },
            ].map((x, i, arr) => (
              <div key={x.l} style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ color: 'white', fontWeight: '800', fontSize: '1.05rem' }}>{x.v}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.67rem' }}>{x.l}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', marginLeft: '0.5rem' }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ ...sTitSec, marginBottom: '0.75rem' }}>🔧 Herramientas asignadas</div>
            {cargandoPanel ? (
              <p style={{ color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>Cargando...</p>
            ) : herramientas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: '#F9FAFB', borderRadius: '10px', border: '1.5px dashed #E5E7EB' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔧</div>
                <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>No hay herramientas asignadas.</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>Usa "+ Herramientas" en la tarjeta de la persona.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {herramientas.map(h => (
                  <div key={h.asignacion_id} style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0.75rem 1rem', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '7px', flexShrink: 0, background: '#F0FDFA', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                          {h.foto_url ? <img src={h.foto_url} alt={h.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🔧'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.85rem' }}>{h.nombre}</div>
                          <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{formatBs(h.precio)}</div>
                        </div>
                      </div>
                      {h.estado && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '20px',
                          background: h.estado === 'tiene' ? '#DCFCE7' : h.estado === 'perdida' ? '#FEE2E2' : h.estado === 'reponer' ? '#FEF3C7' : '#EDE9FE',
                          color:      h.estado === 'tiene' ? '#16A34A' : h.estado === 'perdida' ? '#DC2626' : h.estado === 'reponer' ? '#D97706' : '#7C3AED',
                        }}>
                          {h.estado === 'tiene' ? '✅ Tiene' : h.estado === 'perdida' ? '⚠️ Perdido' : h.estado === 'reponer' ? '🔄 Reponer' : '💸 Descuento'}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {(['tiene', 'perdida', 'reponer', 'descuento'] as const).map(op => {
                        const activo = h.estado === op
                        const colores: Record<string, string> = { tiene: '#16A34A', perdida: '#DC2626', reponer: '#D97706', descuento: '#7C3AED' }
                        const col = colores[op]
                        return (
                          <button key={op} className="rev-tog" onClick={() => onEstadoChange(h.asignacion_id, op)}
                            style={{ flex: 1, background: activo ? col : 'white', borderColor: activo ? col : '#E5E7EB', color: activo ? 'white' : '#6B7280', fontWeight: activo ? '700' : '600' }}>
                            {op === 'tiene' ? 'Tiene' : op === 'perdida' ? 'Perdido' : op === 'reponer' ? 'Reponer' : 'Descuento'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ ...sTitSec, marginBottom: '0.5rem' }}>📝 Observaciones</div>
            <textarea className="her-input" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones de esta revisión (opcional)..." rows={3}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '0.875rem', color: '#111827', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.5' }} />
          </div>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', background: 'white', flexShrink: 0 }}>
          {guardado ? (
            <div style={{ textAlign: 'center', padding: '0.75rem', background: '#DCFCE7', borderRadius: '10px', color: '#16A34A', fontWeight: '700', fontSize: '0.9rem' }}>✅ Revisión guardada correctamente</div>
          ) : (
            <>
              {errGuardar && <p style={{ ...sErrMsg, marginBottom: '0.5rem' }}>⚠️ {errGuardar}</p>}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={onCerrar} style={{ ...sBtnSec, flexShrink: 0, padding: '0.625rem 1rem' }}>Cancelar</button>
                <button onClick={onGuardar} disabled={guardando} style={{ flex: 1, ...sBtnPrim, opacity: guardando ? 0.7 : 1, cursor: guardando ? 'wait' : 'pointer', padding: '0.625rem 1rem' }}>
                  {guardando ? 'Guardando...' : '💾 Guardar revisión'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Estilos compartidos ───────────────────────────────────────────────────────
const sInput: CSSProperties    = { padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white', width: '100%' }
const sLabel: CSSProperties    = { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }
const sTitSec: CSSProperties   = { fontSize: '0.75rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
const sBtnPrim: CSSProperties  = { background: 'linear-gradient(135deg,#0D9488,#0F766E)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }
const sBtnSec: CSSProperties   = { background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }
const sBtnX: CSSProperties     = { background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }
const sOverlay: CSSProperties  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, backdropFilter: 'blur(2px)' }
const sModalBox: CSSProperties = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(440px,calc(100vw - 2rem))', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 2001, overflow: 'hidden' }
const sModalHdr: CSSProperties = { background: 'linear-gradient(135deg,#0D9488,#0F766E)', padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }
const sErrMsg: CSSProperties   = { color: '#DC2626', fontSize: '0.82rem', margin: 0, background: '#FEE2E2', padding: '0.5rem 0.75rem', borderRadius: '8px' }
