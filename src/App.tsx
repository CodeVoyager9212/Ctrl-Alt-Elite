import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import ResumePage from "./pages/ResumePage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ApplyPage from "./pages/ApplyPage";
import ApplicationConfirmationPage from "./pages/ApplicationConfirmationPage";
import { supabase } from "./lib/supabase";
import "./App.css";

type AuthRouteProps = {
  children: ReactNode;
  loading: boolean;
  session: Session | null;
};

function AuthLoading() {
  return (
    <main className="auth-container" aria-live="polite">
      <p>Checking your session...</p>
    </main>
  );
}

function ProtectedRoute({ children, loading, session }: AuthRouteProps) {
  if (loading) return <AuthLoading />;

  return session ? children : <Navigate to="/login" replace />;
}

function PublicAuthRoute({ children, loading, session }: AuthRouteProps) {
  if (loading) return <AuthLoading />;

  return session ? <Navigate to="/profile" replace /> : children;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setAuthLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicAuthRoute loading={authLoading} session={session}>
              <LoginPage />
            </PublicAuthRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicAuthRoute loading={authLoading} session={session}>
              <SignupPage />
            </PublicAuthRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute loading={authLoading} session={session}>
              {session && (
                <ProfilePage key={session.user.id} user={session.user} />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/resumes"
          element={
            <ProtectedRoute loading={authLoading} session={session}>
              {session && (
                <ResumePage key={session.user.id} user={session.user} />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute loading={authLoading} session={session}>
              {session && <ApplicationsPage key={session.user.id} user={session.user} />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:jobId/apply"
          element={
            <ProtectedRoute loading={authLoading} session={session}>
              {session && <ApplyPage key={session.user.id} user={session.user} />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications/:applicationId/confirmation"
          element={
            <ProtectedRoute loading={authLoading} session={session}>
              {session && <ApplicationConfirmationPage key={session.user.id} user={session.user} />}
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
