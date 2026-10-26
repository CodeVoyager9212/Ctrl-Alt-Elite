
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
import FindJobsPage from "./pages/FindJobsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import ApplicationLayout from "./components/layout/ApplicationLayout";

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

function ProtectedRoute({
  children,
  loading,
  session,
}: AuthRouteProps) {
  if (loading) return <AuthLoading />;

  return session ? children : <Navigate to="/login" replace />;
}

function PublicAuthRoute({
  children,
  loading,
  session,
}: AuthRouteProps) {
  if (loading) return <AuthLoading />;

  return session ? (
    <Navigate to="/profile" replace />
  ) : (
    children
  );
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
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (active) {
          setSession(nextSession);
          setAuthLoading(false);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Login Page */}
        <Route
          path="/login"
          element={
            <PublicAuthRoute
              loading={authLoading}
              session={session}
            >
              <LoginPage />
            </PublicAuthRoute>
          }
        />

        {/* Signup Page */}
        <Route
          path="/signup"
          element={
            <PublicAuthRoute
              loading={authLoading}
              session={session}
            >
              <SignupPage />
            </PublicAuthRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute
              loading={authLoading}
              session={session}
            >
              {session && (
                <ApplicationLayout
                  key={session.user.id}
                  user={session.user}
                />
              )}
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <PlaceholderPage
                eyebrow="Your workspace"
                title="Dashboard"
                description="Your CareerConnect overview will appear here."
              />
            }
          />
          <Route path="/find-jobs" element={<FindJobsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route
            path="/saved-jobs"
            element={
              <PlaceholderPage
                eyebrow="Your shortlist"
                title="Saved Jobs"
                description="Saved jobs are not implemented yet."
              />
            }
          />
          <Route path="/resumes" element={<ResumePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/notifications"
            element={
              <PlaceholderPage
                eyebrow="Stay up to date"
                title="Notifications"
                description="Notifications are not implemented yet."
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
