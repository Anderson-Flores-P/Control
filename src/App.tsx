import { useState } from 'react'
import { StoreProvider, useStore } from './lib/store'
import { Sidebar } from './components/Sidebar'
import { PanelView } from './views/PanelView'
import { MateriasView } from './views/MateriasView'
import { SemanasView } from './views/SemanasView'
import { FestivosView } from './views/FestivosView'
import { CiclosView } from './views/CiclosView'
import { ConfigView } from './views/ConfigView'
import type { ViewId } from './types'

function Shell() {
  const [view, setView] = useState<ViewId>('panel')
  const [materiaId, setMateriaId] = useState<string | null>(null)
  const { activeCiclo } = useStore()

  const openMateria = (id: string) => {
    setMateriaId(id)
    setView('materias')
  }

  const navigate = (v: ViewId) => {
    if (v !== 'materias') setMateriaId(null)
    setView(v)
  }

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onNavigate={navigate}
        cicloNombre={activeCiclo.nombre}
        cicloArchivado={activeCiclo.archivado}
      />
      <main className="main-stage">
        {view === 'panel' && (
          <PanelView onNavigate={navigate} onOpenMateria={openMateria} />
        )}
        {view === 'materias' && (
          <MateriasView selectedId={materiaId} onSelect={setMateriaId} />
        )}
        {view === 'semanas' && <SemanasView onOpenMateria={openMateria} />}
        {view === 'festivos' && <FestivosView />}
        {view === 'ciclos' && <CiclosView />}
        {view === 'config' && <ConfigView />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
