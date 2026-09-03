import { Routes, Route } from 'react-router-dom';
import { DatasetProvider } from './context/DatasetContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { AlertsPage } from './pages/AlertsPage';
import { InvestigationPage } from './pages/InvestigationPage';
import { GraphPage } from './pages/GraphPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { MLPage } from './pages/MLPage';
import { EntitiesPage } from './pages/EntitiesPage';

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <Header />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/investigations/:entityId" element={<InvestigationPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/datasets" element={<DatasetsPage />} />
            <Route path="/ml" element={<MLPage />} />
            <Route path="/entities" element={<EntitiesPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DatasetProvider>
      <Layout />
    </DatasetProvider>
  );
}