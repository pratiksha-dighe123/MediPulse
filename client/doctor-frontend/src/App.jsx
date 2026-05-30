import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HospitalRegisterPage from './pages/HospitalRegisterPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import PatientDashboardPage from './pages/PatientDashboardPage';
import PatientProfilePage from './pages/PatientProfilePage';
import HospitalDashboardPage from './pages/HospitalDashboardPage';
import AmbulanceModulePage from './pages/AmbulanceModulePage';
import AmbulanceDriverDashboardPage from './pages/AmbulanceDriverDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import { getAuthSession } from './lib/auth';
import { getDefaultRouteByRole } from './lib/api';

function App() {
  const session = getAuthSession();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={session ? <Navigate to={getDefaultRouteByRole(session.role)} replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/hospital/register" element={<HospitalRegisterPage />} />
      <Route
        path="/ambulance"
        element={
          <ProtectedRoute allowedRoles={['hospital']}>
            <AmbulanceModulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ambulance/driver/dashboard"
        element={
          <ProtectedRoute allowedRoles={['driver']}>
            <AmbulanceDriverDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['doctor', 'admin']}>
            <DoctorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/profile"
        element={
          <ProtectedRoute allowedRoles={['doctor', 'admin']}>
            <DoctorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute allowedRoles={['patient', 'admin']}>
            <PatientDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/profile"
        element={
          <ProtectedRoute allowedRoles={['patient', 'admin']}>
            <PatientProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospital/dashboard"
        element={
          <ProtectedRoute allowedRoles={['hospital']}>
            <HospitalDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
