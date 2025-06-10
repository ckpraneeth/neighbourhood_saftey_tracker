import { Navigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  let decoded;
  try {
    decoded = jwtDecode(token); // Just call jwtDecode directly
  } catch (e) {
    // Invalid token or decode error, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (role && decoded.role !== role) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
