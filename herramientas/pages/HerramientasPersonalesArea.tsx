import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'

interface Props {
  areaId:     string
  areaNombre: string
  onCerrar:   () => void
}

interface ItemPersonal {
  nombre:  string
  cantidad: number
  precio:  number | null
  estado:  string
}

interface GrupoColaborador {
  personal_id: string
  nombre:      string
  items:       ItemPersonal[]
}

export default function HerramientasPersonalesArea({ areaId, areaNombre, onCerrar }: Props) {
  const [grupos,   setGrupos]   = useState<GrupoColaborador[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargar() }, [areaId])

  async function cargar() {
    setCargando(true)

    const { data: personalRaw } = await supabase
      .from('herramientas_personal')
      .select('id, nombre')
      .eq('area_id', areaId)
      .eq('activo', true)
      .order('nombre')

    const personal = (personalRaw ?? []) as { id: string; nombre: string }[]

    if (personal.length === 0) { setGrupos([]); setCargando(false); return }

    const ids = personal.map(p => p.id)
    const { data: asigRaw } = await supabase
      .from('herramientas_asignaciones')
      .select('personal_id, cantidad, estado, herramientas_items(nombre, precio, tipo)')
      .in('personal_id', ids)
      .is('fecha_devolucion', null)

    const asignaciones = ((asigRaw ?? []) as Record<string, unknown>[])
      .map(r => ({
        personal_id: r.personal_id as string,
        cantidad:    r.cantidad as number,
        estado:      r.estado as string,
        item:        r.herramientas_items as { nombre: string; precio: number | null; tipo: string } | null,
      }))
      .filter(r => r.item?.tipo === 'personal')

    const porPersona = new Map<string, ItemPersonal[]>()
    for (const a of asignaciones) {
      const lista = porPersona.get(a.personal_id) ?? []
      lista.push({ nombre: a.item!.nombre, cantidad: a.cantidad, precio: a.item!.precio, estado: a.estado })
      porPersona.set(a.personal_id, lista)
    }

    setGrupos(
      personal
        .map(p => ({ personal_id: p.id, nombre: p.nombre, items: porPersona.get(p.id) ?? [] }))
        .filter(g => g.items.length > 0)
    )
    setCargando(false)
  }

  const totalItems = grupos.reduce((s, g) => s + g.items.length, 0)

  return (
    <>
      <div onClick={onCerrar} className="panel-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, backdropFilter: 'blur(2px)' }} />
      <div className="panel-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px,100vw)', background: '#F7F9FC', zIndex: 3001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)' }}>

        <div style={{ background: 'linear-gradient(135deg,#3BA9FF 0%,#2563EB 60%,#123C7A 100%)', padding: '1.25rem 1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem' }}>🧰 Herramientas personales del área</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{areaNombre}</div>
            </div>
            <button onClick={onCerrar} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0 }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {cargando ? (
            <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>Cargando...</p>
          ) : grupos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧰</div>
              <p style={{ color: '#9CA3AF', fontSize: '0.875rem', margin: 0 }}>
                Nadie en este sector tiene herramientas personales registradas todavía.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF', fontWeight: '600' }}>
                {totalItems} herramienta{totalItems !== 1 ? 's' : ''} personal{totalItems !== 1 ? 'es' : ''} · {grupos.length} colaborador{grupos.length !== 1 ? 'es' : ''}
              </p>
              {grupos.map(g => (
                <div key={g.personal_id} className="her-card" style={{ padding: '1rem 1.15rem' }}>
                  <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.9rem', marginBottom: '0.7rem' }}>👤 {g.nombre}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {g.items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.82rem', color: '#374151' }}>
                        <span>{it.nombre}{it.cantidad > 1 ? ` ×${it.cantidad}` : ''}</span>
                        {it.precio != null && <span style={{ color: '#9CA3AF', flexShrink: 0 }}>Bs {it.precio.toFixed(2)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
