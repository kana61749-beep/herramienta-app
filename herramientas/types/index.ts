export interface AreaHerramienta {
  id: string
  empresa_id: string | null
  nombre: string
  slug: string
  revisor_nombre: string | null
  dia_revision: number
  hora_inicio: string | null
  hora_fin: string | null
  descripcion: string | null
  activo: boolean
  archivado: boolean
  created_at: string
  updated_at: string
}
