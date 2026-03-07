import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ModulePage from './pages/Module'
import DokumentePage from './pages/Dokumente'
import KarteikartenPage from './pages/Karteikarten'
import KalenderPage from './pages/Kalender'
import EinstellungenPage from './pages/Einstellungen'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="module" element={<ModulePage />} />
            <Route path="dokumente" element={<DokumentePage />} />
            <Route path="karteikarten" element={<KarteikartenPage />} />
            <Route path="kalender" element={<KalenderPage />} />
            <Route path="einstellungen" element={<EinstellungenPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
