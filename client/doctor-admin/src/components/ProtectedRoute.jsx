import { Navigate } from 'react-router-dom';
import { getSession } from '../lib/auth';

function ProtectedRoute({ children, allowedRoles = ['admin'] }) {
  const session = getSession();

  if (!session?.token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
