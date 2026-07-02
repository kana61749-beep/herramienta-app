import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'
import type { AreaHerramienta } from '../types'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

type Tab = 'herramientas' | 'revisiones' | 'solicitudes' | 'historial' | 'informacion'

const TABS: { id: Tab; icono: string; label: string }[] = [
  { id: 'herramientas', icono: '🔧', label: 'Herramientas' },
  { id: 'revisiones',   icono: '📋', label: 'Revisiones'   },
  { id: 'solicitudes',  icono: '📨', label: 'Solicitudes'  },
  { id: 'historial',    icono: '🕐', label: 'Historial'    },
  { id: 'informacion',  icono: 'ℹ️',  label: 'Información' },
]

const ESTADO_ITEM: Record<string, { label: string; color: string; bg: string }> = {
  completa:   { label: 'Completa',   color: '#16A34A', bg: '#DCFCE7' },
  faltante:   { label: 'Faltante',   color: '#D97706', bg: '#FEF3C7' },
  perdida:    { label: 'Perdida',    color: '#DC2626', bg: '#FEE2E2' },
  encontrada: { label: 'Encontrada', color: '#0369A1', bg: '#DBEAFE' },
  repuesta:   { label: 'Repuesta',   color: '#2563EB', bg: '#EFF6FF' },
}

interface ItemHerramienta {
  id:             string
  nombre:         string
  descripcion:    string | null
  cantidad_total: number
  precio:         number | null
  moneda:         string
  estado:         string
  created_at:     string
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ItemsHerramientasDetalle() {
  const { areaId } = useParams<{ areaId: string }>()
  const navigate   = useNavigate()

  const [area,        setArea]        = useState<AreaHerramienta | null>(null)
  const [cargando,    setCargando]    = useState(true)
  const [errorCarga,  setErrorCarga]  = useState(false)
  const [tabActiva,   setTabActiva]   = useState<Tab>('herramientas')
  const [busqueda,    setBusqueda]    = useState('')

  // Herramientas del área
  const [items,           setItems]           = useState<ItemHerramienta[]>([])
  const [cargandoItems,   setCargandoItems]   = useState(false)

  // Modal nueva herramienta
  const [modalItem,       setModalItem]       = useState(false)
  const [formNombre,      setFormNombre]      = useState('')
  const [formCantidad,    setFormCantidad]    = useState(1)
  const [formPrecio,      setFormPrecio]      = useState('')
  const [formFotoB64,     setFormFotoB64]     = useState<string | null>(null)
  const [guardandoItem,   setGuardandoItem]   = useState(false)
  const [errItem,         setErrItem]         = useState('')
  const fotoInputRef = useRef<HTMLInputElement>(null)

  // Eliminar herramienta
  const [pendEliminar,    setPendEliminar]    = useState<ItemHerramienta | null>(null)
  const [eliminando,      setEliminando]      = useState(false)
  const [bloqueadoMsg,    setBloqueadoMsg]    = useState<string | null>(null)

  useEffect(() => {
    if (!areaId) return
    cargar()
  }, [areaId])

  async function cargar() {
    setCargando(true); setErrorCarga(false)
    const { data, error } = await supabase
      .from('herramientas_areas')
      .select('*')
      .eq('id', areaId)
      .single()
    if (error || !data) { setErrorCarga(true); setCargando(false); return }
    setArea(data as AreaHerramienta)
    setCargando(false)
    cargarItems()
  }

  async function cargarItems() {
    if (!areaId) return
    setCargandoItems(true)
    const { data } = await supabase
      .from('herramientas_items')
      .select('id, nombre, descripcion, cantidad_total, precio, moneda, estado, created_at')
      .eq('area_id', areaId)
      .eq('tipo', 'area')
      .order('nombre')
    setItems(data ?? [])
    setCargandoItems(false)
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFormFotoB64(ev.target?.result as string ?? null)
    reader.readAsDataURL(file)
  }

  function resetFormItem() {
    setFormNombre(''); setFormCantidad(1); setFormPrecio(''); setFormFotoB64(null); setErrItem('')
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  async function guardarItem() {
    if (!formNombre.trim()) { setErrItem('El nombre es requerido.'); return }
    const precio = formPrecio ? parseFloat(formPrecio) : null
    if (formPrecio && (isNaN(precio!) || precio! < 0)) { setErrItem('Precio inválido.'); return }
    setGuardandoItem(true); setErrItem('')
    const { error } = await supabase.from('herramientas_items').insert({
      tipo:           'area',
      area_id:        areaId,
      nombre:         formNombre.trim(),
      descripcion:    null,
      foto_url:       formFotoB64,
      estado:         'completa',
      cantidad_total: formCantidad,
      precio,
      moneda:         'BOB',
    })
    if (error) {
      setErrItem('Error al guardar. Verifica que ejecutaste el SQL de migración.')
      setGuardandoItem(false)
      return
    }
    setModalItem(false)
    resetFormItem()
    setGuardandoItem(false)
    cargarItems()
  }

  async function eliminarItem() {
    if (!pendEliminar) return
    setEliminando(true)

    const { count } = await supabase
      .from('herramientas_asignaciones')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', pendEliminar.id)

    if ((count ?? 0) > 0) {
      setEliminando(false)
      setPendEliminar(null)
      setBloqueadoMsg('Esta herramienta está asignada a personal. Primero debes devolverla o quitar la asignación.')
      return
    }

    const { error } = await supabase.from('herramientas_items').delete().eq('id', pendEliminar.id)
    setEliminando(false)

    if (error) {
      setPendEliminar(null)
      setBloqueadoMsg('Error al eliminar: ' + error.message)
      return
    }

    setPendEliminar(null)
    cargarItems()
  }

  const filtrados = items.filter(i =>
    busqueda === '' || i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (cargando) return <div style={{ padding: '1.5rem' }}><p style={sTxtGris}>Cargando...</p></div>

  if (errorCarga || !area) return (
    <div style={{ padding: '1.5rem' }}>
      <button onClick={() => navigate('/herramientas/areas')} style={sBtnVolver}>← Herramientas Áreas</button>
      <p style={{ color: '#EF4444', marginTop: '1rem', fontSize: '0.875rem' }}>No se encontró el área.</p>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`
        .her-input:focus { border-color: #2563EB !important; outline: none; box-shadow: 0 0 0 3px rgba(59,169,255,0.12); }
        .her-tab:hover   { opacity: 0.8; }
        .item-row        { transition: background 0.1s; }
        .item-row:hover  { background: #F0FDFA !important; }
        .btn-eliminar:hover { background: #FEE2E2 !important; color: #DC2626 !important; }
        .modal-overlay   { animation: panelFade 0.15s ease; }
        .modal-box       { animation: scaleIn   0.18s ease; }
        @keyframes panelFade { from { opacity: 0 }                        to { opacity: 1 }              }
        @keyframes scaleIn   { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 }}
      `}</style>

      {/* ── Volver ── */}
      <button onClick={() => navigate('/herramientas/areas')} style={sBtnVolver}>
        ← Herramientas Áreas
      </button>

      {/* ── Encabezado del área ── */}
      <div style={{ background: 'linear-gradient(135deg,#3BA9FF 0%,#2563EB 60%,#123C7A 100%)', borderRadius: '20px', padding: '1.4rem 1.6rem', marginBottom: '1.25rem', boxShadow: '0 10px 26px rgba(37,99,235,0.28)' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>
          🗂️ {area.nombre}
        </h1>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.625rem' }}>
          <span style={sInfoTxt}>👤 {area.revisor_nombre ?? 'Sin revisor asignado'}</span>
          {area.dia_revision > 0 && (
            <span style={sInfoTxt}>
              📅 {DIAS[area.dia_revision]}
              {area.hora_inicio ? ` · ${area.hora_inicio}` : ''}
              {area.hora_fin    ? ` – ${area.hora_fin}`    : ''}
            </span>
          )}
        </div>
        {area.descripcion && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
            {area.descripcion}
          </p>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: '0.9rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',     icono: '📦', valor: items.length,                                          variante: 'azul'  },
          { label: 'Completas', icono: '✅', valor: items.filter(i => i.estado === 'completa').length,     variante: 'verde' },
          { label: 'Faltantes', icono: '⚠️', valor: items.filter(i => i.estado === 'faltante' || i.estado === 'perdida').length, variante: 'rojo' },
        ].map(s => (
          <div key={s.label} className={`her-stat-card her-stat-card--${s.variante}`} style={{ flex: '1 1 130px', minWidth: '130px', textAlign: 'center' }}>
            <div className="her-stat-icon" style={{ margin: '0 auto 0.7rem' }}>{s.icono}</div>
            <div className="her-stat-valor">{s.valor}</div>
            <div className="her-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', marginBottom: '1.25rem', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            className="her-tab"
            onClick={() => setTabActiva(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.625rem 0.875rem', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: '600', color: tabActiva === t.id ? '#2563EB' : '#6B7280', borderBottom: tabActiva === t.id ? '2px solid #2563EB' : '2px solid transparent', marginBottom: '-2px' }}
          >
            {t.icono} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Herramientas ── */}
      {tabActiva === 'herramientas' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              className="her-input"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar herramienta..."
              style={{ ...sInput, flex: '1', minWidth: '180px' }}
            />
            <button className="her-btn her-btn--primary" onClick={() => { resetFormItem(); setModalItem(true) }}>
              + Agregar herramienta
            </button>
          </div>

          {cargandoItems && <p style={{ ...sTxtGris, textAlign: 'center', padding: '1rem' }}>Cargando herramientas...</p>}

          {!cargandoItems && filtrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔧</div>
              <p style={sTxtGris}>{items.length === 0 ? 'No hay herramientas registradas en esta área.' : 'Ninguna herramienta coincide con la búsqueda.'}</p>
              {items.length === 0 && <p style={{ ...sTxtGris, fontSize: '0.8rem', marginTop: '0.25rem' }}>Usa "+ Agregar herramienta" para comenzar.</p>}
            </div>
          )}

          {!cargandoItems && filtrados.length > 0 && (
            <div className="her-card" style={{ overflow: 'hidden' }}>
              {filtrados.map((item, i) => {
                const est = ESTADO_ITEM[item.estado] ?? ESTADO_ITEM.completa
                return (
                  <div
                    key={item.id}
                    className="item-row"
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.125rem', borderBottom: i < filtrados.length - 1 ? '1px solid #F3F4F6' : 'none', background: 'white' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg,#2563EB,#123C7A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                      🔧
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.nombre}
                      </div>
                      {item.descripcion && (
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.descripcion}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                        ×{item.cantidad_total}
                        {item.precio != null ? ` · Bs ${item.precio.toFixed(2)}` : ''}
                      </span>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700', background: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                      <button
                        className="btn-eliminar"
                        onClick={() => setPendEliminar(item)}
                        title="Eliminar herramienta"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.3rem', borderRadius: '8px', lineHeight: 1, color: '#9CA3AF', flexShrink: 0, transition: 'all 0.15s' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs vacíos ── */}
      {tabActiva === 'revisiones'  && <TabVacia icono="📋" mensaje="No hay revisiones registradas para esta área." />}
      {tabActiva === 'solicitudes' && <TabVacia icono="📨" mensaje="No hay solicitudes para esta área." />}
      {tabActiva === 'historial'   && <TabVacia icono="🕐" mensaje="Sin historial registrado." />}

      {/* ── Tab: Información ── */}
      {tabActiva === 'informacion' && (
        <div className="her-card" style={{ padding: '1.25rem' }}>
          <InfoFila label="Nombre"       valor={area.nombre} />
          <InfoFila label="Slug"         valor={<code style={sCode}>{area.slug}</code>} />
          <InfoFila label="Revisor"      valor={area.revisor_nombre ?? '—'} />
          <InfoFila label="Día revisión" valor={area.dia_revision > 0 ? DIAS[area.dia_revision] : '—'} />
          {area.hora_inicio && (
            <InfoFila label="Horario" valor={`${area.hora_inicio}${area.hora_fin ? ` – ${area.hora_fin}` : ''}`} />
          )}
          {area.descripcion && <InfoFila label="Descripción" valor={area.descripcion} />}
          <InfoFila
            label="Estado"
            valor={<span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', background: area.activo ? '#DCFCE7' : '#F1F5F9', color: area.activo ? '#16A34A' : '#6B7280' }}>{area.activo ? 'Activa' : 'Inactiva'}</span>}
          />
        </div>
      )}

      {/* ── Modal nueva herramienta ── */}
      {modalItem && (
        <>
          <div className="modal-overlay" onClick={() => setModalItem(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, backdropFilter: 'blur(2px)' }} />
          <div className="modal-box" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(460px,calc(100vw - 2rem))', background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 2001, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#2563EB,#123C7A)', padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>🔧 Nueva herramienta — {area.nombre}</span>
              <button onClick={() => setModalItem(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={sLabel}>Foto</label>
                <input ref={fotoInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button className="her-btn her-btn--secondary her-btn--sm" type="button" onClick={() => fotoInputRef.current?.click()}>
                    📷 {formFotoB64 ? 'Cambiar foto' : 'Seleccionar foto'}
                  </button>
                  {formFotoB64 && (
                    <>
                      <img src={formFotoB64} alt="Preview" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #E5E7EB', flexShrink: 0 }} />
                      <button type="button" onClick={() => { setFormFotoB64(null); if (fotoInputRef.current) fotoInputRef.current.value = '' }}
                        style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem' }}>
                        ✕ Quitar
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label style={sLabel}>Nombre <span style={{ color: '#DC2626' }}>*</span></label>
                <input className="her-input" value={formNombre} onChange={e => setFormNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && guardarItem()} placeholder="Ej: Tijeras, Regla, Sello..." style={sInput} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={sLabel}>Precio (Bs)</label>
                  <input className="her-input" type="number" min={0} step="0.01" value={formPrecio} onChange={e => setFormPrecio(e.target.value)} placeholder="0.00" style={sInput} />
                </div>
                <div>
                  <label style={sLabel}>Cantidad</label>
                  <input className="her-input" type="number" min={1} value={formCantidad} onChange={e => setFormCantidad(Math.max(1, parseInt(e.target.value) || 1))} style={sInput} />
                </div>
              </div>
              {errItem && (
                <p style={{ color: '#DC2626', fontSize: '0.82rem', margin: 0, background: '#FEE2E2', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  ⚠️ {errItem}
                </p>
              )}
            </div>

            <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button className="her-btn her-btn--secondary" onClick={() => setModalItem(false)} style={{ flexShrink: 0 }}>Cancelar</button>
              <button className="her-btn her-btn--primary" onClick={guardarItem} disabled={guardandoItem} style={{ flex: 1 }}>
                {guardandoItem ? 'Guardando...' : 'Guardar herramienta'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal confirmar eliminación ── */}
      {pendEliminar && (
        <>
          <div className="modal-overlay" onClick={() => !eliminando && setPendEliminar(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2100 }} />
          <div className="modal-box" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(400px,calc(100vw - 2rem))', background: 'white', borderRadius: '22px', boxShadow: '0 20px 60px rgba(13,37,84,0.25)', zIndex: 2101, padding: '1.75rem' }}>
            <h2 style={{ margin: '0 0 0.625rem', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Eliminar herramienta</h2>
            <p style={{ margin: '0 0 0.375rem', fontSize: '0.875rem', color: '#374151', lineHeight: 1.55 }}>
              ¿Seguro que deseas eliminar <strong>"{pendEliminar.nombre}"</strong>?
            </p>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.5 }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="her-btn her-btn--secondary her-btn--sm" onClick={() => setPendEliminar(null)} disabled={eliminando}>Cancelar</button>
              <button className="her-btn her-btn--sm" onClick={eliminarItem} disabled={eliminando}
                style={{ background: 'linear-gradient(135deg, #F87171, #DC2626)', color: 'white', boxShadow: '0 6px 16px rgba(220,38,38,0.28)' }}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal informativo: no se puede eliminar ── */}
      {bloqueadoMsg && (
        <>
          <div className="modal-overlay" onClick={() => setBloqueadoMsg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2100 }} />
          <div className="modal-box" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(400px,calc(100vw - 2rem))', background: 'white', borderRadius: '22px', boxShadow: '0 20px 60px rgba(13,37,84,0.25)', zIndex: 2101, padding: '1.75rem' }}>
            <h2 style={{ margin: '0 0 0.625rem', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>⚠️ No se puede eliminar</h2>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#374151', lineHeight: 1.55 }}>
              {bloqueadoMsg}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="her-btn her-btn--primary her-btn--sm" onClick={() => setBloqueadoMsg(null)}>Entendido</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function TabVacia({ icono, mensaje }: { icono: string; mensaje: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icono}</div>
      <p style={sTxtGris}>{mensaje}</p>
    </div>
  )
}

function InfoFila({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
      <span style={{ color: '#9CA3AF', fontWeight: '600', minWidth: '120px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '0.875rem', flex: 1 }}>{valor}</span>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const sInput: CSSProperties       = { padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white', width: '100%' }
const sCode: CSSProperties        = { background: '#F1F5F9', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }
const sTxtGris: CSSProperties     = { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }
const sInfoTxt: CSSProperties     = { fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }
const sLabel: CSSProperties       = { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }
const sBtnVolver: CSSProperties   = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#2563EB', fontWeight: '600', padding: '0 0 1rem 0', display: 'block' }
