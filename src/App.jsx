import ResetPassword from './pages/ResetPassword.jsx';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, ROLE_HOME } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';

import ResidentHome from './pages/resident/ResidentHome.jsx';
import CollectorHome from './pages/collector/CollectorHome.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';

function ProtectedRoute({ role, children }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return <p className="muted center">Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, ready } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          ready && user
            ? <Navigate to={ROLE_HOME[user.role]} replace />
            : <Login />
        }
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
  path="/reset-password"
  element={<ResetPassword />}
/>

      <Route
        path="/resident"
        element={
          <ProtectedRoute role="resident">
            <ResidentHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/collector"
        element={
          <ProtectedRoute role="collector">
            <CollectorHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={user ? ROLE_HOME[user.role] : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}
