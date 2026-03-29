import { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/features/AuthProvider';
import { useAuth } from './components/features/useAuth';
import { MatchProvider } from './hooks/useMatch';
import { Layout } from './components/layout/Layout';
import { LoadingState } from './components/ui/LoadingState';
import { Home } from './pages/Home';
import { Login } from './pages/Login';

const Teams = lazy(() => import('./pages/Teams').then((module) => ({ default: module.Teams })));
const Stats = lazy(() => import('./pages/Stats').then((module) => ({ default: module.Stats })));
const TeamDetails = lazy(() => import('./pages/TeamDetails').then((module) => ({ default: module.TeamDetails })));

function RouteFallback() {
  return (
    <LoadingState
      title="Laster side"
      message="Vi henter neste arbeidsflate og gjør innholdet klart."
    />
  );
}

// Protected Route Wrapper
function RequireAuth({ children }: { children: JSX.Element }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <LoadingState
        title="Henter arbeidsflate"
        message="Vi klargjør live-visningen og lagdataene dine."
      />
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;

  return children;
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <MatchProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes Placeholders */}
            <Route path="/stats" element={
              <RequireAuth>
                <Suspense fallback={<RouteFallback />}>
                  <Stats />
                </Suspense>
              </RequireAuth>
            } />
            <Route path="/teams" element={
              <RequireAuth>
                <Suspense fallback={<RouteFallback />}>
                  <Teams />
                </Suspense>
              </RequireAuth>
            } />
            <Route path="/teams/:teamId" element={
              <RequireAuth>
                <Suspense fallback={<RouteFallback />}>
                  <TeamDetails />
                </Suspense>
              </RequireAuth>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </MatchProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
