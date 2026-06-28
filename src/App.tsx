import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import LoginHerramientas from '../herramientas/pages/LoginHerramientas'
import AuthCallbackHerramientas from '../herramientas/pages/AuthCallbackHerramientas'
import LayoutHerramientas from '../herramientas/components/LayoutHerramientas'
import RutaProtegidaHerramientas from '../herramientas/components/RutaProtegidaHerramientas'
import AreasHerramientas from '../herramientas/pages/AreasHerramientas'
import Herramientas from '../herramientas/pages/Herramientas'
import ItemsHerramientas from '../herramientas/pages/ItemsHerramientas'
import ItemsHerramientasDetalle from '../herramientas/pages/ItemsHerramientasDetalle'
import HerramientasPersonal from '../herramientas/pages/HerramientasPersonal'
import SolicitudesHerramientas from '../herramientas/pages/SolicitudesHerramientas'
import PerdidasHerramientas from '../herramientas/pages/PerdidasHerramientas'
import ReportesHerramientas from '../herramientas/pages/ReportesHerramientas'
import ConfiguracionHerramientas from '../herramientas/pages/ConfiguracionHerramientas'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/herramientas/login" element={<LoginHerramientas />} />
        <Route path="/herramientas/auth"  element={<AuthCallbackHerramientas />} />
        <Route element={<RutaProtegidaHerramientas />}>
          <Route path="/herramientas" element={<LayoutHerramientas />}>
            <Route index element={<Herramientas />} />
            <Route path="areas"         element={<AreasHerramientas />} />
            <Route path="items"             element={<ItemsHerramientas />} />
            <Route path="items/:areaId"     element={<ItemsHerramientasDetalle />} />
            <Route path="personal"      element={<HerramientasPersonal />} />
            <Route path="solicitudes"   element={<SolicitudesHerramientas />} />
            <Route path="perdidas"      element={<PerdidasHerramientas />} />
            <Route path="reportes"      element={<ReportesHerramientas />} />
            <Route path="configuracion" element={<ConfiguracionHerramientas />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/herramientas" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
