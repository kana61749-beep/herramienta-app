import { useState, useEffect, type CSSProperties } from 'react'
import { supabase } from '../../src/lib/supabase'

export default function ConfiguracionHerramientas() {
  const [configId,       setConfigId]       = useState<number | null>(null)
  const [diaRevision,    setDiaRevision]    = useState('1')
  const [horarioTarde,   setHorarioTarde]   = useState('15:00')
  const [horarioNoche,   setHorarioNoche]   = useState('20:00')
  const [tiempoBusqueda, setTiempoBusqueda] = useState('7')
  const [diasDescuento,  setDiasDescuento]  = useState('14')
  const [cargando,       setCargando]       = useState(true)
  const [guardando,      setGuardando]      = useState(false)
  const [guardado,       setGuardado]       = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  useEffect(() => { cargarConfig() }, [])

  async function cargarConfig() {
    setCargando(true)
    const { data, error: err } = await supabase
      .from('herramientas_config_revision')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (data) {
      setConfigId(data.id)
      setDiaRevision(String(data.dia_revision_personal ?? 1))
      setHorarioTarde((data.hora_inicio_personal ?? '15:00:00').slice(0, 5))
      setHorarioNoche((data.hora_fin_personal    ?? '20:00:00').slice(0, 5))
      setTiempoBusqueda(String(data.tiempo_busqueda_dias  ?? 7))
      setDiasDescuento(String(data.dias_antes_descuento   ?? 14))
    }
    if (err) setError(err.message)
    setCargando(false)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const payload = {
      dia_revision_personal: parseInt(diaRevision),
      hora_inicio_personal:  horarioTarde + ':00',
      hora_fin_personal:     horarioNoche + ':00',
      tiempo_busqueda_dias:  parseInt(tiempoBusqueda),
      dias_antes_descuento:  parseInt(diasDescuento),
    }
    let err
    if (configId) {
      const res = await supabase
        .from('herramientas_config_revision')
        .update(payload)
        .eq('id', configId)
      err = res.error
    } else {
      const res = await supabase
        .from('herramientas_config_revision')
        .insert(payload)
        .select('id')
        .single()
      err = res.error
      if (res.data) setConfigId(res.data.id)
    }
    setGuardando(false)
    if (err) setError(err.message)
    else { setGuardado(true); setTimeout(() => setGuardado(false), 2500) }
  }

  if (cargando) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9CA3AF', marginTop: '3rem' }}>
        Cargando configuración...
      </div>
    )
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`.her-input:focus { border-color: #3BA9FF !important; outline: none; box-shadow: 0 0 0 3px rgba(59,169,255,0.12); }`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>⚙️ Configuración</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
          Ajustes generales del sistema de control de herramientas
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '640px' }}>

        {/* ── Sección: Revisión ── */}
        <div style={sSeccion}>
          <div style={sTituloSeccion}>📅 Configuración de revisión</div>

          <div>
            <label style={sLabel}>Día de revisión semanal</label>
            <select className="her-input" value={diaRevision} onChange={e => setDiaRevision(e.target.value)} style={sInput}>
              {DIAS.map((d, i) => <option key={i + 1} value={String(i + 1)}>{d}</option>)}
            </select>
            <p style={sHint}>Día en que se realizan las revisiones generales</p>
          </div>

          <div style={sGrilla}>
            <div>
              <label style={sLabel}>🌇 Horario tarde</label>
              <input className="her-input" type="time" value={horarioTarde} onChange={e => setHorarioTarde(e.target.value)} style={sInput} />
              <p style={sHint}>Turno de tarde para revisión</p>
            </div>
            <div>
              <label style={sLabel}>🌙 Horario noche</label>
              <input className="her-input" type="time" value={horarioNoche} onChange={e => setHorarioNoche(e.target.value)} style={sInput} />
              <p style={sHint}>Turno de noche para revisión</p>
            </div>
          </div>
        </div>

        {/* ── Sección: Pérdidas ── */}
        <div style={sSeccion}>
          <div style={sTituloSeccion}>⚠️ Control de pérdidas</div>

          <div style={sGrilla}>
            <div>
              <label style={sLabel}>Tiempo de búsqueda (días)</label>
              <input className="her-input" type="number" min="1" max="30" value={tiempoBusqueda} onChange={e => setTiempoBusqueda(e.target.value)} style={sInput} />
              <p style={sHint}>Días de búsqueda antes de pasar a 2ª semana</p>
            </div>
            <div>
              <label style={sLabel}>Días antes de aplicar descuento</label>
              <input className="her-input" type="number" min="1" max="60" value={diasDescuento} onChange={e => setDiasDescuento(e.target.value)} style={sInput} />
              <p style={sHint}>Días de gracia antes de descontar el costo</p>
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#DC2626' }}>
            ❌ {error}
          </div>
        )}

        {/* ── Botón guardar ── */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={guardar}
            disabled={guardando}
            style={{ ...sBtnPrimario, opacity: guardando ? 0.7 : 1, cursor: guardando ? 'wait' : 'pointer' }}
          >
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
          {guardado && (
            <span style={{ fontSize: '0.85rem', color: '#16A34A', fontWeight: '600' }}>
              ✅ Guardado correctamente
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const sSeccion: CSSProperties       = { background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '1rem' }
const sTituloSeccion: CSSProperties = { fontSize: '0.78rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }
const sGrilla: CSSProperties        = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }
const sLabel: CSSProperties         = { display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }
const sInput: CSSProperties         = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white' }
const sHint: CSSProperties          = { margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#9CA3AF' }
const sBtnPrimario: CSSProperties   = { background: 'linear-gradient(135deg, #2563EB, #123C7A)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }
