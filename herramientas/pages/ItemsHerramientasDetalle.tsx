import { useEffect, useState, type CSSProperties } from 'react'
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
  repuesta:   { label: 'Repuesta',   color: '#7C3AED', bg: '#EDE9FE' },
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
  const [formDesc,        setFormDesc]        = useState('')
  const [formCantidad,    setFormCantidad]    = useState('1')
  const [formPrecio,      setFormPrecio]      = useState('')
  const [formEstado,      setFormEstado]      = useState('completa')
  const [formFotoUrl,     setFormFotoUrl]     = useState('')
  const [guardandoItem,   setGuardandoItem]   = useState(false)
  const [errItem,         setErrItem]         = useState('')

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

  async function guardarItem() {
    if (!formNombre.trim()) { setErrItem('El nombre es requerido.'); return }
    setGuardandoItem(true); setErrItem('')
    const { error } = await supabase.from('herramientas_items').insert({
      tipo:           'area',
      area_id:        areaId,
      nombre:         formNombre.trim(),
      descripcion:    formDesc.trim()    || null,
      foto_url:       formFotoUrl.trim() || null,
      estado:         formEstado,
      cantidad_total: parseInt(formCantidad) > 0 ? parseInt(formCantidad) : 1,
      precio:         formPrecio !== '' ? parseFloat(formPrecio) : null,
      moneda:         'BOB',
    })
    if (error) {
      setErrItem('Error al guardar. Verifica que ejecutaste el SQL de migración.')
      setGuardandoItem(false)
      return
    }
    setModalItem(false)
    setFormNombre(''); setFormDesc(''); setFormCantidad('1'); setFormPrecio(''); setFormEstado('completa'); setFormFotoUrl('')
    setGuardandoItem(false)
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
        .her-input:focus { border-color: #0D9488 !important; outline: none; box-shadow: 0 0 0 3px rgba(13,148,136,0.12); }
        .her-tab:hover   { opacity: 0.8; }
        .item-row        { transition: background 0.1s; }
        .item-row:hover  { background: #F0FDFA !important; }
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
      <div style={{ background: 'linear-gradient(135deg,#0D9488 0%,#0F766E 100%)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1rem', boxShadow: '0 2px 10px rgba(13,148,136,0.25)' }}>
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
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',     valor: items.length,                                          color: '#0D9488' },
          { label: 'Completas', valor: items.filter(i => i.estado === 'completa').length,     color: '#16A34A' },
          { label: 'Faltantes', valor: items.filter(i => i.estado === 'faltante' || i.estado === 'perdida').length, color: '#DC2626' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0.75rem 1rem', flex: '1', minWidth: '80px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.valor}</div>
            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: '600', marginTop: '0.2rem' }}>{s.label}</div>
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.625rem 0.875rem', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: '600', color: tabActiva === t.id ? '#0D9488' : '#6B7280', borderBottom: tabActiva === t.id ? '2px solid #0D9488' : '2px solid transparent', marginBottom: '-2px' }}
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
            <button style={sBtnPrimario} onClick={() => { setModalItem(true); setErrItem(''); setFormNombre(''); setFormDesc(''); setFormCantidad('1'); setFormPrecio(''); setFormEstado('completa'); setFormFotoUrl('') }}>
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
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              {filtrados.map((item, i) => {
                const est = ESTADO_ITEM[item.estado] ?? ESTADO_ITEM.completa
                return (
                  <div
                    key={item.id}
                    className="item-row"
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.125rem', borderBottom: i < filtrados.length - 1 ? '1px solid #F3F4F6' : 'none', background: 'white' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(135deg,#0D9488,#0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
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
        <div style={sCard}>
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
          <div className="modal-box" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(460px,calc(100vw - 2rem))', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 2001, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#0D9488,#0F766E)', padding: '1.125rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>🔧 Nueva herramienta — {area.nombre}</span>
              <button onClick={() => setModalItem(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '8px', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={sLabel}>Nombre <span style={{ color: '#DC2626' }}>*</span></label>
                <input className="her-input" value={formNombre} onChange={e => setFormNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && guardarItem()} placeholder="Ej: Tijeras, Regla, Sello..." style={sInput} autoFocus />
              </div>
              <div>
                <label style={sLabel}>Descripción</label>
                <input className="her-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Opcional" style={sInput} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={sLabel}>Cantidad</label>
                  <input className="her-input" type="number" min="1" value={formCantidad} onChange={e => setFormCantidad(e.target.value)} style={sInput} />
                </div>
                <div>
                  <label style={sLabel}>Precio (Bs)</label>
                  <input className="her-input" type="number" min="0" step="0.01" value={formPrecio} onChange={e => setFormPrecio(e.target.value)} placeholder="0.00" style={sInput} />
                </div>
              </div>
              <div>
                <label style={sLabel}>Estado</label>
                <select className="her-input" value={formEstado} onChange={e => setFormEstado(e.target.value)} style={sInput}>
                  <option value="completa">Completa</option>
                  <option value="faltante">Faltante</option>
                  <option value="perdida">Perdida</option>
                  <option value="encontrada">Encontrada</option>
                  <option value="repuesta">Repuesta</option>
                </select>
              </div>
              <div>
                <label style={sLabel}>Foto (URL opcional)</label>
                <input className="her-input" value={formFotoUrl} onChange={e => setFormFotoUrl(e.target.value)} placeholder="https://..." style={sInput} />
              </div>
              {errItem && (
                <p style={{ color: '#DC2626', fontSize: '0.82rem', margin: 0, background: '#FEE2E2', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  ⚠️ {errItem}
                </p>
              )}
            </div>

            <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setModalItem(false)} style={{ ...sBtnSecundario, flexShrink: 0 }}>Cancelar</button>
              <button onClick={guardarItem} disabled={guardandoItem} style={{ flex: 1, ...sBtnPrimario, opacity: guardandoItem ? 0.7 : 1, cursor: guardandoItem ? 'wait' : 'pointer' }}>
                {guardandoItem ? 'Guardando...' : 'Guardar herramienta'}
              </button>
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
const sCard: CSSProperties        = { background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)' }
const sInput: CSSProperties       = { padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white', width: '100%' }
const sCode: CSSProperties        = { background: '#F1F5F9', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }
const sTxtGris: CSSProperties     = { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }
const sInfoTxt: CSSProperties     = { fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }
const sLabel: CSSProperties       = { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }
const sBtnVolver: CSSProperties   = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#0D9488', fontWeight: '600', padding: '0 0 1rem 0', display: 'block' }
const sBtnPrimario: CSSProperties = { background: 'linear-gradient(135deg,#0D9488,#0F766E)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.125rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }
const sBtnSecundario: CSSProperties = { background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }
