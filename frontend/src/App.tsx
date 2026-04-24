import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PermissionsProvider } from './contexts/PermissionsContext';
import AppLayout from './layouts/AppLayout';
import BiensPage from './pages/BiensPage';
import DashboardPage from './pages/DashboardPage';
import AffectationsPage from './pages/AffectationsPage';
import InventairePage from './pages/InventairePage';
import ReformePage from './pages/ReformePage';
import SinistresPage from './pages/SinistresPage';
import EntretiensPage from './pages/EntretiensPage';
import StocksPage from './pages/StocksPage';
import UsersPage from './pages/UsersPage';
import LoginPage from './pages/LoginPage';
import { getCurrentUser } from './api/auth';
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
    <BrowserRouter>
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
          <Route path="biens" element={<BiensPage />} />
          <Route path="affectations" element={<AffectationsPage />} />
          <Route path="inventaire" element={<InventairePage />} />
          <Route path="reforme" element={<ReformePage />} />
          <Route path="sinistres" element={<SinistresPage />} />
          <Route path="entretiens" element={<EntretiensPage />} />
          <Route path="stocks" element={<StocksPage />} />
          <Route path="utilisateurs" element={<UsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
