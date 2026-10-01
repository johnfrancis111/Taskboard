import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Board from './pages/Board.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash">Loading…</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><AuthPage mode="signup" /></GuestOnly>} />
      <Route path="/" element={<Protected><Board /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
