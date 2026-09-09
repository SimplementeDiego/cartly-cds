import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../auth/AuthProvider';

function RouteLoader() {
  return (
    <Box role="status" aria-label="Verificando sesión" sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: '45vh', sm: '55vh' }, px: 2 }}>
      <CircularProgress size={34} />
    </Box>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <RouteLoader />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <RouteLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
