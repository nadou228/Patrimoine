import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PermissionsProvider } from './contexts/PermissionsContext';
import AppLayout from './layouts/AppLayout';
import BiensPage from './pages/BiensPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TerrainPage from './pages/TerrainPage';
import AffectationsPage from './pages/AffectationsPage';
import InventairePage from './pages/InventairePage';
import ReformePage from './pages/ReformePage';
import SinistresPage from './pages/SinistresPage';
import EntretiensPage from './pages/EntretiensPage';
import StocksPage from './pages/StocksPage';
import UsersPage from './pages/UsersPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import AuditPage from './pages/AuditPage';
import { getCurrentUser } from './api/auth';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ToastProvider } from './contexts/ToastContext';
import './styles.css';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <PermissionsProvider>
                  <AppLayout />
                </PermissionsProvider>
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="biens" element={<BiensPage />} />
              <Route path="affectations" element={<AffectationsPage />} />
              <Route path="inventaire" element={<InventairePage />} />
              <Route path="terrain" element={<TerrainPage />} />
              <Route path="rapports" element={<ReportsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="reforme" element={<ReformePage />} />
              <Route path="sinistres" element={<SinistresPage />} />
              <Route path="entretiens" element={<EntretiensPage />} />
              <Route path="stocks" element={<StocksPage />} />
              <Route path="utilisateurs" element={<UsersPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
