import { supabase } from '../../src/lib/supabase'

export type VarianteAlerta = 'rojo' | 'amarillo' | 'morado' | 'verde' | 'azul'

export interface Alerta {
  id:       string
  variante: VarianteAlerta
  icono:    string
  titulo:   string
  detalle:  string
}

function calcularDiasRetraso(diaRevisionPersonal: number, ultimaRevision: string | null): number {
  const diaJS = diaRevisionPersonal === 7 ? 0 : diaRevisionPersonal
  const hoy   = new Date()
  let diasDesde = hoy.getDay() - diaJS
  if (diasDesde < 0) diasDesde += 7
  const esperada = new Date(hoy)
  esperada.setDate(hoy.getDate() - diasDesde)
  if (ultimaRevision) {
    const ultima = new Date(ultimaRevision.split('T')[0])
    if (ultima >= esperada) return 0
  }
  return diasDesde
}

function diasDesdeFecha(fechaISO: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const f   = new Date(fechaISO.split('T')[0]); f.setHours(0, 0, 0, 0)
  return Math.round((hoy.getTime() - f.getTime()) / 86400000)
}

function resumenNombres(nombres: string[]): string {
  const unicos = Array.from(new Set(nombres))
  if (unicos.length === 0) return ''
  if (unicos.length <= 3) return unicos.join(', ')
  return `${unicos.slice(0, 3).join(', ')} y ${unicos.length - 3} más`
}

/**
 * Deriva las alertas del panel de Inicio a partir del estado real de las tablas
 * (no persiste nada nuevo: se recalculan en cada carga, así que desaparecen solas
 * en cuanto la condición deja de cumplirse).
 */
export async function obtenerAlertas(): Promise<Alerta[]> {
  const alertas: Alerta[] = []

  const [asigRes, cfgRes, personalRes] = await Promise.all([
    supabase
      .from('herramientas_asignaciones')
      .select('id, estado, item_id, personal_id, herramientas_items(nombre)')
      .in('estado', ['perdida', 'descuento', 'reponer']),
    supabase
      .from('herramientas_config_revision')
      .select('dia_revision_personal, dias_antes_descuento')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('herramientas_personal')
      .select('id, nombre, area_id, activo, herramientas_areas(nombre)'),
  ])

  const asignaciones = ((asigRes.data ?? []) as Record<string, unknown>[]).map(r => ({
    id:                 r.id as string,
    estado:             r.estado as string,
    item_id:            r.item_id as string,
    personal_id:        r.personal_id as string,
    herramientas_items: r.herramientas_items as { nombre: string } | null,
  }))

  const personal = ((personalRes.data ?? []) as Record<string, unknown>[]).map(r => ({
    id:                 r.id as string,
    nombre:             r.nombre as string,
    area_id:            r.area_id as string | null,
    activo:             r.activo as boolean,
    herramientas_areas: r.herramientas_areas as { nombre: string } | null,
  }))
  const nombrePorPersona = new Map(personal.map(p => [p.id, p.nombre]))

  const cfg = cfgRes.data as { dia_revision_personal: number; dias_antes_descuento: number | null } | null
  const diasAntesDescuento = cfg?.dias_antes_descuento ?? 14

  const perdidas   = asignaciones.filter(a => a.estado === 'perdida')
  const descuentos = asignaciones.filter(a => a.estado === 'descuento')
  const reponer    = asignaciones.filter(a => a.estado === 'reponer')

  if (perdidas.length > 0) {
    alertas.push({
      id:       'perdidas',
      variante: 'rojo',
      icono:    '⚠️',
      titulo:   `${perdidas.length} herramienta${perdidas.length !== 1 ? 's' : ''} perdida${perdidas.length !== 1 ? 's' : ''}`,
      detalle:  resumenNombres(perdidas.map(p => p.herramientas_items?.nombre ?? 'Herramienta')),
    })

    const asigIds = perdidas.map(p => p.id)
    const { data: perdRows } = await supabase
      .from('herramientas_perdidas')
      .select('asignacion_id, fecha_reporte')
      .in('asignacion_id', asigIds)
      .order('fecha_reporte', { ascending: false })

    const fechaPorAsig = new Map<string, string>()
    for (const r of (perdRows ?? []) as { asignacion_id: string; fecha_reporte: string }[]) {
      if (!fechaPorAsig.has(r.asignacion_id)) fechaPorAsig.set(r.asignacion_id, r.fecha_reporte)
    }

    const porVencer = perdidas.filter(p => {
      const fecha = fechaPorAsig.get(p.id)
      return fecha != null && diasDesdeFecha(fecha) === diasAntesDescuento - 1
    })

    if (porVencer.length > 0) {
      alertas.push({
        id:       'por-vencer-descuento',
        variante: 'amarillo',
        icono:    '⏳',
        titulo:   `${porVencer.length} herramienta${porVencer.length !== 1 ? 's' : ''} a 1 día de generar descuento`,
        detalle:  resumenNombres(porVencer.map(p => p.herramientas_items?.nombre ?? 'Herramienta')),
      })
    }
  }

  if (descuentos.length > 0) {
    alertas.push({
      id:       'descuentos',
      variante: 'morado',
      icono:    '💸',
      titulo:   `${descuentos.length} descuento${descuentos.length !== 1 ? 's' : ''} aplicado${descuentos.length !== 1 ? 's' : ''}`,
      detalle:  resumenNombres(descuentos.map(d => nombrePorPersona.get(d.personal_id) ?? 'Colaborador')),
    })
  }

  if (reponer.length > 0) {
    alertas.push({
      id:       'reponer',
      variante: 'verde',
      icono:    '🔄',
      titulo:   `${reponer.length} reposición${reponer.length !== 1 ? 'es' : ''} registrada${reponer.length !== 1 ? 's' : ''}`,
      detalle:  resumenNombres(reponer.map(r => r.herramientas_items?.nombre ?? 'Herramienta')),
    })
  }

  if (cfg) {
    const activos = personal.filter(p => p.activo && p.area_id)
    if (activos.length > 0) {
      const ids = activos.map(p => p.id)
      const { data: revRaw } = await supabase
        .from('herramientas_revisiones')
        .select('personal_id, fecha_revision')
        .eq('tipo', 'personal')
        .in('personal_id', ids)
        .order('fecha_revision', { ascending: false })

      const ultimaPorPersona = new Map<string, string>()
      for (const r of (revRaw ?? []) as { personal_id: string; fecha_revision: string }[]) {
        if (!ultimaPorPersona.has(r.personal_id)) ultimaPorPersona.set(r.personal_id, r.fecha_revision)
      }

      const areasConRetraso = new Set<string>()
      for (const p of activos) {
        const retraso = calcularDiasRetraso(cfg.dia_revision_personal, ultimaPorPersona.get(p.id) ?? null)
        if (retraso > 0) areasConRetraso.add(p.herramientas_areas?.nombre ?? 'Área sin nombre')
      }

      if (areasConRetraso.size > 0) {
        const nombres = Array.from(areasConRetraso)
        alertas.push({
          id:       'revision-pendiente',
          variante: 'azul',
          icono:    '📋',
          titulo:   `${nombres.length} área${nombres.length !== 1 ? 's' : ''} con revisión pendiente`,
          detalle:  resumenNombres(nombres),
        })
      }
    }
  }

  return alertas
}
