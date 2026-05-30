import { Navigate } from 'react-router-dom';
import { getAuthSession } from '../lib/auth';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const session = getAuthSession();

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
