import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import { getSession } from './lib/auth';

function App() {
  const session = getSession();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session?.token ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={session?.token ? <Navigate to="/dashboard" replace /> : <AdminLoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
