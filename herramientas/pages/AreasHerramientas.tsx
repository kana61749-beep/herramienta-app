import { useEffect, useState, useRef, type CSSProperties, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'
import type { AreaHerramienta } from '../types'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const PALETA = [
  'linear-gradient(135deg, #3BA9FF, #2563EB)',
  'linear-gradient(135deg, #123C7A, #0D2554)',
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

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface FormArea {
  nombre: string; slug: string; revisor: string
  diaRevision: number; horaInicio: string; horaFin: string
  descripcion: string; activo: boolean
}

type TabArea = 'todas' | 'activas' | 'inactivas' | 'archivadas'

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AreasHerramientas() {
  const navigate = useNavigate()
  const [todas,         setTodas]         = useState<AreaHerramienta[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [errorCarga,    setErrorCarga]    = useState(false)
  const [tab,           setTab]           = useState<TabArea>('todas')
  const [busqueda,      setBusqueda]      = useState('')
  const [modalAbierto,  setModalAbierto]  = useState(false)
  const [areaEditando,  setAreaEditando]  = useState<AreaHerramienta | null>(null)
  const [pendArchivar,  setPendArchivar]  = useState<AreaHerramienta | null>(null)
  const [pendRestaurar, setPendRestaurar] = useState<AreaHerramienta | null>(null)
  const [pendEliminar,  setPendEliminar]  = useState<AreaHerramienta | null>(null)
  const [guardando,     setGuardando]     = useState(false)
  const [errGuardar,    setErrGuardar]    = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true); setErrorCarga(false)
    const { data, error } = await supabase
      .from('herramientas_areas').select('*').order('nombre')
    if (error) { setErrorCarga(true); setCargando(false); return }
    setTodas(data ?? [])
    setCargando(false)
  }

  // ── Valores computados ────────────────────────────────────────────────────
  const noArchivadas = todas.filter(a => !a.archivado)
  const activas      = noArchivadas.filter(a => a.activo)
  const inactivas    = noArchivadas.filter(a => !a.activo)
  const archivadas   = todas.filter(a => a.archivado)

  const porTab =
    tab === 'activas'    ? activas    :
    tab === 'inactivas'  ? inactivas  :
    tab === 'archivadas' ? archivadas : noArchivadas

  const filtradas = porTab.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const TABS: { id: TabArea; label: string; count: number }[] = [
    { id: 'todas',      label: 'Todas',      count: noArchivadas.length },
    { id: 'activas',    label: 'Activas',    count: activas.length },
    { id: 'inactivas',  label: 'Inactivas',  count: inactivas.length },
    { id: 'archivadas', label: 'Archivadas', count: archivadas.length },
  ]

  // ── Acciones ──────────────────────────────────────────────────────────────
  function abrirCrear()                  { setAreaEditando(null); setErrGuardar(''); setModalAbierto(true) }
  function abrirEditar(a: AreaHerramienta) { setAreaEditando(a);   setErrGuardar(''); setModalAbierto(true) }
  function cerrarModal()                 { setModalAbierto(false); setErrGuardar('') }

  async function guardarArea(form: FormArea) {
    setGuardando(true); setErrGuardar('')
    const payload = {
      nombre: form.nombre.trim(), slug: form.slug.trim(),
      revisor_nombre: form.revisor.trim() || null,
      dia_revision: form.diaRevision,
      hora_inicio: form.horaInicio || null, hora_fin: form.horaFin || null,
      descripcion: form.descripcion.trim() || null, activo: form.activo,
    }

    if (!areaEditando) {
      const { data: existente } = await supabase
        .from('herramientas_areas').select('id, archivado').eq('slug', payload.slug).maybeSingle()
      if (existente) {
        setErrGuardar(existente.archivado
          ? 'Esta área ya existe archivada. Puedes restaurarla desde la pestaña Archivadas.'
          : 'Ya existe un área activa con este slug. Usa un nombre diferente.')
        setGuardando(false); return
      }
      const { data, error } = await supabase
        .from('herramientas_areas').insert(payload).select().single()
      if (error) { setErrGuardar(error.message); setGuardando(false); return }
      setTodas(prev => [...prev, data as AreaHerramienta].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    } else {
      const { data, error } = await supabase
        .from('herramientas_areas').update(payload).eq('id', areaEditando.id).select().single()
      if (error) { setErrGuardar(error.message); setGuardando(false); return }
      setTodas(prev =>
        prev.map(a => a.id === areaEditando.id ? data as AreaHerramienta : a)
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      )
    }
    setGuardando(false); setModalAbierto(false); setErrGuardar('')
  }

  async function toggleActivo(area: AreaHerramienta) {
    const { data, error } = await supabase
      .from('herramientas_areas').update({ activo: !area.activo }).eq('id', area.id).select().single()
    if (error || !data) return
    setTodas(prev => prev.map(a => a.id === area.id ? data as AreaHerramienta : a))
  }

  async function archivarArea() {
    if (!pendArchivar) return
    setGuardando(true)
    const { error } = await supabase.from('herramientas_areas').update({ archivado: true }).eq('id', pendArchivar.id)
    if (error) { setGuardando(false); return }
    setTodas(prev => prev.map(a => a.id === pendArchivar.id ? { ...a, archivado: true } : a))
    setGuardando(false); setPendArchivar(null)
  }

  async function restaurarArea() {
    if (!pendRestaurar) return
    setGuardando(true)
    const { error } = await supabase.from('herramientas_areas').update({ archivado: false }).eq('id', pendRestaurar.id)
    if (error) { setGuardando(false); return }
    setTodas(prev => prev.map(a => a.id === pendRestaurar.id ? { ...a, archivado: false } : a))
    setGuardando(false); setPendRestaurar(null)
  }

  async function eliminarArea() {
    if (!pendEliminar) return
    setGuardando(true)
    const { error } = await supabase.from('herramientas_areas').delete().eq('id', pendEliminar.id)
    if (error) { setGuardando(false); return }
    setTodas(prev => prev.filter(a => a.id !== pendEliminar.id))
    setGuardando(false); setPendEliminar(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`
        .her-input:focus { border-color: #3BA9FF !important; outline: none; box-shadow: 0 0 0 3px rgba(59,169,255,0.12); }
        .her-tab { transition: color 0.15s; }
        .her-tab:hover { color: #3BA9FF !important; }
        .menu-item:hover { background: #EFF6FF !important; }
        .menu-item-danger:hover { background: #FEF2F2 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>📍 Áreas</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Sectores que reciben y gestionan herramientas
          </p>
        </div>
        <button onClick={abrirCrear} style={sBtnPrimario}>+ Nueva área</button>
      </div>

      {/* ── Buscador ── */}
      <input
        className="her-input"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar área..."
        style={{ ...sInput, maxWidth: '340px', marginBottom: '1rem' }}
      />

      {/* ── Tabs con contadores ── */}
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
            <span style={{
              padding: '0.1rem 0.45rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700',
              background: tab === t.id ? '#DBEAFE' : '#F3F4F6',
              color:      tab === t.id ? '#2563EB' : '#9CA3AF',
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Lista ── */}
      {cargando ? (
        <p style={sTxtGris}>Cargando áreas...</p>

      ) : errorCarga ? (
        <p style={{ ...sTxtGris, color: '#EF4444' }}>
          No se pudieron cargar las áreas.{' '}
          <button onClick={cargar} style={sBtnInline}>Reintentar</button>
        </p>

      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📍</div>
          <p style={sTxtGris}>
            {busqueda
              ? `No hay áreas que coincidan con "${busqueda}".`
              : tab === 'archivadas' ? 'No hay áreas archivadas.'
              : tab === 'inactivas'  ? 'No hay áreas inactivas.'
              : 'No hay áreas registradas todavía.'}
          </p>
          {!busqueda && tab === 'todas' && (
            <button onClick={abrirCrear} style={{ ...sBtnInline, color: '#3BA9FF', fontWeight: '700', marginTop: '0.5rem' }}>
              + Crear la primera área
            </button>
          )}
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtradas.map(a => (
            <AreaCard key={a.id} area={a}
              onVer={()          => navigate(`/herramientas/items/${a.id}`)}
              onEditar={()       => abrirEditar(a)}
              onToggleActivo={() => toggleActivo(a)}
              onArchivar={()     => setPendArchivar(a)}
              onRestaurar={()    => setPendRestaurar(a)}
              onEliminar={()     => setPendEliminar(a)}
            />
          ))}
        </div>
      )}

      {/* ── Modal crear / editar ── */}
      {modalAbierto && (
        <ModalArea
          area={areaEditando} guardando={guardando} error={errGuardar}
          onGuardar={guardarArea} onCerrar={cerrarModal}
        />
      )}

      {/* ── Modal archivar ── */}
      {pendArchivar && (
        <ModalConfirmar
          titulo="Archivar área"
          mensaje={`¿Archivar "${pendArchivar.nombre}"? Dejará de aparecer en la lista activa. Puedes restaurarla desde la pestaña Archivadas.`}
          etiquetaConfirmar="Sí, archivar" colorConfirmar="#D97706"
          guardando={guardando} onConfirmar={archivarArea} onCancelar={() => setPendArchivar(null)}
        />
      )}

      {/* ── Modal restaurar ── */}
      {pendRestaurar && (
        <ModalConfirmar
          titulo="Restaurar área"
          mensaje={`¿Restaurar "${pendRestaurar.nombre}"? Volverá a aparecer en la lista de áreas activas.`}
          etiquetaConfirmar="Sí, restaurar" colorConfirmar="#3BA9FF"
          guardando={guardando} onConfirmar={restaurarArea} onCancelar={() => setPendRestaurar(null)}
        />
      )}

      {/* ── Modal eliminar ── */}
      {pendEliminar && (
        <ModalConfirmar
          titulo="Eliminar área definitivamente"
          mensaje={`¿Seguro que deseas eliminar "${pendEliminar.nombre}" definitivamente? Esta acción no se puede deshacer.`}
          etiquetaConfirmar="Sí, eliminar definitivamente" colorConfirmar="#EF4444"
          guardando={guardando} onConfirmar={eliminarArea} onCancelar={() => setPendEliminar(null)}
        />
      )}
    </div>
  )
}

// ─── Tarjeta de área ──────────────────────────────────────────────────────────
function AreaCard({ area, onVer, onEditar, onToggleActivo, onArchivar, onRestaurar, onEliminar }: {
  area: AreaHerramienta
  onVer: () => void; onEditar: () => void; onToggleActivo: () => void
  onArchivar: () => void; onRestaurar: () => void; onEliminar: () => void
}) {
  const borde  = area.archivado ? '#D97706' : area.activo ? '#3BA9FF' : '#9CA3AF'
  const grad   = gradienteArea(area.nombre)
  const inicial = area.nombre.charAt(0).toUpperCase()

  const opcionesMenu = area.archivado
    ? [
        { label: '↩️ Restaurar',           onClick: onRestaurar, danger: false },
        { label: '🗑️ Eliminar definitivo', onClick: onEliminar,  danger: true  },
      ]
    : [
        { label: '🔧 Ver herramientas',              onClick: onVer,          danger: false },
        { label: '✏️ Editar',                        onClick: onEditar,        danger: false },
        { label: area.activo ? '⏸ Desactivar' : '▶ Activar', onClick: onToggleActivo, danger: false },
        { label: '📦 Archivar',                      onClick: onArchivar,      danger: false },
      ]

  return (
    <div style={{
      background: 'white', borderRadius: '12px',
      border: `1px solid #E5E7EB`, borderLeft: `4px solid ${borde}`,
      padding: '1rem 1rem 1rem 1.125rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      opacity: area.archivado ? 0.8 : 1,
    }}>
      {/* Icono */}
      <div style={{
        width: '42px', height: '42px', borderRadius: '10px', background: grad, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: '800', fontSize: '1.15rem',
      }}>
        {inicial}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>{area.nombre}</span>
          <BadgeEstado area={area} />
        </div>
        <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#6B7280' }}>
          <span>👤 {area.revisor_nombre ?? 'Sin revisor'}</span>
          {area.dia_revision > 0 && <span>📅 {DIAS[area.dia_revision]}</span>}
          {area.hora_inicio && (
            <span>🕐 {area.hora_inicio}{area.hora_fin ? ` – ${area.hora_fin}` : ''}</span>
          )}
        </div>
        {area.descripcion && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {area.descripcion}
          </p>
        )}
      </div>

      {/* Menú 3 puntos */}
      <Menu3Puntos opciones={opcionesMenu} />
    </div>
  )
}

// ─── Badge de estado ──────────────────────────────────────────────────────────
function BadgeEstado({ area }: { area: AreaHerramienta }) {
  if (area.archivado)
    return <span style={{ ...sBadge, background: '#FEF3C7', color: '#92400E' }}>Archivada</span>
  if (area.activo)
    return <span style={{ ...sBadge, background: '#DCFCE7', color: '#16A34A' }}>Activa</span>
  return   <span style={{ ...sBadge, background: '#F1F5F9', color: '#6B7280' }}>Inactiva</span>
}

// ─── Menú de tres puntos ──────────────────────────────────────────────────────
function Menu3Puntos({ opciones }: {
  opciones: { label: string; onClick: () => void; danger: boolean }[]
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function cerrar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierto])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); setAbierto(v => !v) }}
        style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: abierto ? '#EFF6FF' : 'transparent',
          border: abierto ? '1px solid #BFDBFE' : '1px solid transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', color: '#6B7280', fontWeight: '700',
        }}
        title="Opciones"
      >
        ⋮
      </button>

      {abierto && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 200,
          background: 'white', borderRadius: '10px', padding: '0.375rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)', border: '1px solid #E5E7EB',
          minWidth: '180px',
        }}>
          {opciones.map(op => (
            <button
              key={op.label}
              className={op.danger ? 'menu-item-danger' : 'menu-item'}
              onClick={() => { op.onClick(); setAbierto(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.5rem 0.75rem', borderRadius: '7px',
                fontSize: '0.825rem', fontWeight: '500',
                color: op.danger ? '#EF4444' : '#111827',
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function ModalArea({ area, guardando, error, onGuardar, onCerrar }: {
  area: AreaHerramienta | null; guardando: boolean; error: string
  onGuardar: (form: FormArea) => void; onCerrar: () => void
}) {
  const [form, setForm] = useState<FormArea>({
    nombre:      area?.nombre      ?? '',
    slug:        area?.slug        ?? '',
    revisor:     area?.revisor_nombre ?? '',
    diaRevision: area?.dia_revision ?? 1,
    horaInicio:  area?.hora_inicio ?? '',
    horaFin:     area?.hora_fin    ?? '',
    descripcion: area?.descripcion ?? '',
    activo:      area?.activo      ?? true,
  })
  const [slugManual, setSlugManual] = useState(!!area)
  const valido = form.nombre.trim() !== '' && form.slug.trim() !== ''

  function handleNombre(v: string) {
    setForm(f => ({ ...f, nombre: v, slug: slugManual ? f.slug : toSlug(v) }))
  }
  function handleSubmit(e: FormEvent) {
    e.preventDefault(); if (!valido || guardando) return; onGuardar(form)
  }

  const esConflictoArchivada = error.includes('archivada')

  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        <div style={{ background: 'linear-gradient(135deg, #2563EB, #123C7A)', padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'white' }}>
            {area ? `Editar: ${area.nombre}` : '+ Nueva área'}
          </h2>
          <button onClick={onCerrar} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div>
            <label style={sLabel}>Nombre <Req /></label>
            <input className="her-input" value={form.nombre} onChange={e => handleNombre(e.target.value)} placeholder="Ej: Bisutería" style={sInput} autoFocus />
          </div>

          <div>
            <label style={sLabel}>
              Slug (URL pública) <Req />
              {!slugManual && <span style={{ color: '#9CA3AF', fontWeight: '400', marginLeft: '0.5rem' }}>auto-generado</span>}
            </label>
            <input
              className="her-input"
              value={form.slug}
              onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })) }}
              placeholder="bisuteria"
              style={{ ...sInput, fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>
              /herramientas/revisar/<strong>{form.slug || '…'}</strong>
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={sLabel}>Revisor</label>
              <input className="her-input" value={form.revisor} onChange={e => setForm(f => ({ ...f, revisor: e.target.value }))} placeholder="Nombre del revisor" style={sInput} />
            </div>
            <div>
              <label style={sLabel}>Día de revisión</label>
              <select className="her-input" value={form.diaRevision} onChange={e => setForm(f => ({ ...f, diaRevision: Number(e.target.value) }))} style={sInput}>
                {DIAS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={sLabel}>Hora inicio</label>
              <input className="her-input" type="time" value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))} style={sInput} />
            </div>
            <div>
              <label style={sLabel}>Hora fin</label>
              <input className="her-input" type="time" value={form.horaFin} onChange={e => setForm(f => ({ ...f, horaFin: e.target.value }))} style={sInput} />
            </div>
          </div>

          <div>
            <label style={sLabel}>Descripción</label>
            <textarea className="her-input" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional..." rows={2} style={{ ...sInput, resize: 'vertical', minHeight: '60px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
              style={{ width: '44px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, background: form.activo ? '#3BA9FF' : '#D1D5DB', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', left: form.activo ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
              Área {form.activo ? 'activa' : 'inactiva'}
            </span>
          </div>

          {error && (
            <p style={{ margin: 0, padding: '0.625rem 0.875rem', borderRadius: '8px', fontSize: '0.8rem', lineHeight: 1.5, background: esConflictoArchivada ? '#FFFBEB' : '#FEF2F2', color: esConflictoArchivada ? '#92400E' : '#EF4444', border: `1px solid ${esConflictoArchivada ? '#FDE68A' : '#FECACA'}` }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #F3F4F6' }}>
            <button type="button" onClick={onCerrar} style={sBtnSecundario}>Cancelar</button>
            <button type="submit" disabled={!valido || guardando}
              style={{ ...sBtnPrimario, opacity: (!valido || guardando) ? 0.6 : 1, cursor: (!valido || guardando) ? 'not-allowed' : 'pointer' }}>
              {guardando ? 'Guardando...' : area ? 'Guardar cambios' : 'Crear área'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal confirmación ───────────────────────────────────────────────────────
function ModalConfirmar({ titulo, mensaje, etiquetaConfirmar, colorConfirmar, guardando, onConfirmar, onCancelar }: {
  titulo: string; mensaje: string; etiquetaConfirmar: string
  colorConfirmar: string; guardando: boolean
  onConfirmar: () => void; onCancelar: () => void
}) {
  return (
    <div onClick={onCancelar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '1.75rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: '0 0 0.625rem', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>{titulo}</h2>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.55 }}>{mensaje}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancelar} style={sBtnSecundario}>Cancelar</button>
          <button onClick={onConfirmar} disabled={guardando}
            style={{ background: colorConfirmar, color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.65 : 1 }}>
            {guardando ? 'Procesando...' : etiquetaConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

function Req() { return <span style={{ color: '#EF4444', marginLeft: '0.2rem' }}>*</span> }

// ─── Estilos ──────────────────────────────────────────────────────────────────
const sBadge: CSSProperties         = { padding: '0.18rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600' }
const sInput: CSSProperties         = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white' }
const sLabel: CSSProperties         = { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }
const sTxtGris: CSSProperties       = { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }
const sBtnPrimario: CSSProperties   = { background: 'linear-gradient(135deg, #2563EB, #123C7A)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }
const sBtnSecundario: CSSProperties = { background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }
const sBtnInline: CSSProperties     = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: 0, color: '#3BA9FF', fontWeight: '600' }
