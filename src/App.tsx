import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/features/AuthProvider';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Teams } from './pages/Teams';
import { Stats } from './pages/Stats';

// Protected Route Wrapper
function RequireAuth({ children }: { children: JSX.Element }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <div className="p-8 text-center text-primary">Laster...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;

  return children;
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes Placeholders */}
            <Route path="/stats" element={
              <RequireAuth>
                <Stats />
              </RequireAuth>
            } />
            <Route path="/teams" element={
              <RequireAuth>
                <Teams />
              </RequireAuth>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
