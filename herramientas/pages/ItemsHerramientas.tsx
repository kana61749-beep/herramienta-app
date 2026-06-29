import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../src/lib/supabase'
import type { AreaHerramienta } from '../types'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Paleta determinista por nombre de área
const PALETA = [
  'linear-gradient(135deg, #3BA9FF, #2563EB)',
  'linear-gradient(135deg, #2563EB, #1D4ED8)',
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ItemsHerramientas() {
  const navigate = useNavigate()
  const [areas,      setAreas]      = useState<AreaHerramienta[]>([])
  const [cargando,   setCargando]   = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [busqueda,   setBusqueda]   = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true); setErrorCarga(false)
    const { data, error } = await supabase
      .from('herramientas_areas')
      .select('*')
      .eq('archivado', false)
      .order('nombre')
    if (error) { setErrorCarga(true); setCargando(false); return }
    setAreas(data ?? [])
    setCargando(false)
  }

  const filtradas = areas.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={{ padding: '1.5rem' }}>
      <style>{`.her-input:focus { border-color: #3BA9FF !important; outline: none; box-shadow: 0 0 0 3px rgba(59,169,255,0.12); }`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#111827' }}>🔧 Herramientas</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
          Gestiona todas las herramientas por áreas
        </p>
      </div>

      {/* ── Buscador ── */}
      <input
        className="her-input"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar área de herramientas…"
        style={{ ...sInput, maxWidth: '380px', marginBottom: '1.25rem' }}
      />

      {/* ── Resumen ── */}
      {!cargando && !errorCarga && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={sResumen}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#3BA9FF', lineHeight: 1 }}>{areas.length}</span>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '600', marginTop: '0.2rem' }}>
              {areas.length === 1 ? 'Área creada' : 'Áreas creadas'}
            </span>
          </div>
          <div style={sResumen}>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#2563EB', lineHeight: 1 }}>0</span>
            <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '600', marginTop: '0.2rem' }}>Herramientas registradas</span>
          </div>
        </div>
      )}

      {/* ── Lista ── */}
      {cargando ? (
        <p style={sTxtGris}>Cargando áreas...</p>

      ) : errorCarga ? (
        <p style={{ ...sTxtGris, color: '#EF4444' }}>
          No se pudieron cargar las áreas.{' '}
          <button onClick={cargar} style={sBtnInline}>Reintentar</button>
        </p>

      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔧</div>
          <p style={sTxtGris}>
            {busqueda
              ? 'No hay áreas que coincidan con la búsqueda.'
              : 'No hay áreas creadas todavía.'}
          </p>
          {!busqueda && (
            <p style={{ ...sTxtGris, fontSize: '0.8rem', marginTop: '0.3rem' }}>
              Crea áreas desde la sección <strong>Áreas</strong> del menú lateral.
            </p>
          )}
        </div>

      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtradas.map(a => (
            <AreaCard
              key={a.id}
              area={a}
              onClick={() => navigate(`/herramientas/items/${a.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tarjeta de área ──────────────────────────────────────────────────────────
function AreaCard({ area, onClick }: { area: AreaHerramienta; onClick: () => void }) {
  const grad    = gradienteArea(area.nombre)
  const inicial = area.nombre.charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: 'white', border: '1px solid #E5E7EB',
        borderRadius: '14px', padding: '1rem 1.125rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer', textAlign: 'left', width: '100%',
      }}
      onMouseEnter={e => {
        const b = e.currentTarget
        b.style.borderColor = '#99F6E4'
        b.style.boxShadow   = '0 3px 12px rgba(59,169,255,0.13)'
      }}
      onMouseLeave={e => {
        const b = e.currentTarget
        b.style.borderColor = '#E5E7EB'
        b.style.boxShadow   = '0 1px 4px rgba(0,0,0,0.06)'
      }}
    >
      {/* Icono */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px', background: grad,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: '800', fontSize: '1.3rem', flexShrink: 0,
      }}>
        {inicial}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem', marginBottom: '0.3rem' }}>
          Herramientas {area.nombre}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#6B7280' }}>
          <span>👤 {area.revisor_nombre ?? 'Sin revisor'}</span>
          {area.dia_revision > 0 && <span>📅 {DIAS[area.dia_revision]}</span>}
          <span>🔧 0 herramientas</span>
        </div>
      </div>

      {/* Badge + flecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <span style={{
          padding: '0.2rem 0.65rem', borderRadius: '999px',
          fontSize: '0.72rem', fontWeight: '600',
          background: area.activo ? '#DCFCE7' : '#F1F5F9',
          color:      area.activo ? '#16A34A' : '#6B7280',
        }}>
          {area.activo ? 'Activa' : 'Inactiva'}
        </span>
        <span style={{ color: '#9CA3AF', fontSize: '1.25rem', lineHeight: 1 }}>›</span>
      </div>
    </button>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const sInput: CSSProperties    = { padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1.5px solid #E5E7EB', fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box', background: 'white', width: '100%' }
const sResumen: CSSProperties  = { background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '0.875rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '130px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
const sTxtGris: CSSProperties  = { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }
const sBtnInline: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: 0, color: '#3BA9FF', fontWeight: '600' }
