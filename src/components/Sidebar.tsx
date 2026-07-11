import {
  LayoutDashboard,
  BookOpen,
  CalendarRange,
  CalendarOff,
  Layers,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { ViewId } from '../types'

const NAV: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: 'panel', label: 'Panel', icon: LayoutDashboard },
  { id: 'materias', label: 'Materias', icon: BookOpen },
  { id: 'semanas', label: '20 Semanas', icon: CalendarRange },
  { id: 'festivos', label: 'Festivos', icon: CalendarOff },
  { id: 'ciclos', label: 'Ciclos', icon: Layers },
  { id: 'config', label: 'Configuración', icon: Settings },
]

interface SidebarProps {
  view: ViewId
  onNavigate: (v: ViewId) => void
  cicloNombre: string
  cicloArchivado?: boolean
}

export function Sidebar({
  view,
  onNavigate,
  cicloNombre,
  cicloArchivado,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden />
        <div>
          <h1 className="brand-title">Control Uni</h1>
          <p className="brand-sub">
            {cicloNombre}
            {cicloArchivado ? ' · respaldo' : ''}
          </p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Principal">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item${view === id ? ' active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} strokeWidth={1.75} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <span className="foot-label">Estructura</span>
        <span className="foot-value">20 semanas · por materia</span>
      </div>
    </aside>
  )
}
