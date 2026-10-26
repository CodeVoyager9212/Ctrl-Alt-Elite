
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
import RecruiterJobsPage from "./pages/recruiter/RecruiterJobsPage";
import CreateJobPage from "./pages/recruiter/CreateJobPage";
import JobApplicantsPage from "./pages/recruiter/JobApplicantsPage";
import EditJobPage from "./pages/recruiter/EditJobPage";

import ApplicationLayout from "./components/layout/ApplicationLayout";
import RecruiterLayout from "./components/layout/RecruiterLayout";

import { supabase } from "./lib/supabase";
import type { ProfileRow } from "./types/database";
import "./App.css";

type AccountType = ProfileRow["account_type"];

type ProfileState = {
  userId: string;
  role: AccountType | null;
  error: string;
};

type RouteAuthProps = {
  session: Session | null;
  authLoading: boolean;
  profileState: ProfileState | null;
};

function AuthLoading() {
  return (
    <main className="auth-container" aria-live="polite">
      <p>Checking your account...</p>
    </main>
  );
}

function ProfileError({ message }: { message: string }) {
  return (
    <main className="auth-container" role="alert">
      <h2>Unable to open your workspace</h2>
      <p>{message}</p>
      <p>Please check your account and try again.</p>
    </main>
  );
}

function getHomePath(role: AccountType) {
  return role === "recruiter"
    ? "/recruiter/jobs"
    : "/profile";
}

function resolveAccount({
  session,
  authLoading,
  profileState,
}: RouteAuthProps):
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string }
  | { status: "ready"; role: AccountType } {
  if (authLoading) {
    return { status: "loading" };
  }

  if (!session) {
    return { status: "signed-out" };
  }

  if (
    !profileState ||
    profileState.userId !== session.user.id
  ) {
    return { status: "loading" };
  }

  if (profileState.error || !profileState.role) {
    return {
      status: "error",
      message:
        profileState.error ||
        "Your account role could not be determined.",
    };
  }

  return {
    status: "ready",
    role: profileState.role,
  };
}

function PublicAuthRoute({
  children,
  ...auth
}: RouteAuthProps & { children: ReactNode }) {
  const account = resolveAccount(auth);

  if (account.status === "loading") {
    return <AuthLoading />;
  }

  if (account.status === "error") {
    return <ProfileError message={account.message} />;
  }

  if (account.status === "ready") {
    return (
      <Navigate
        to={getHomePath(account.role)}
        replace
      />
    );
  }

  return <>{children}</>;
}

function RoleRoute({
  children,
  requiredRole,
  ...auth
}: RouteAuthProps & {
  children: ReactNode;
  requiredRole: AccountType;
}) {
  const account = resolveAccount(auth);

  if (account.status === "loading") {
    return <AuthLoading />;
  }

  if (account.status === "signed-out") {
    return <Navigate to="/login" replace />;
  }

  if (account.status === "error") {
    return <ProfileError message={account.message} />;
  }

  if (account.role !== requiredRole) {
    return (
      <Navigate
        to={getHomePath(account.role)}
        replace
      />
    );
  }

  return <>{children}</>;
}

function App() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [profileState, setProfileState] =
    useState<ProfileState | null>(null);

  // Listen for Supabase authentication changes.
  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error("Session error:", error.message);
        }

        setSession(data.session);
        setAuthLoading(false);
      }
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;

        setSession(nextSession);
        setAuthLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Read the authenticated user's actual account type.
  // profiles.account_type is the source of truth.
  useEffect(() => {
    const userId = session?.user.id;

    if (!userId) {
      setProfileState(null);
      return;
    }

    let active = true;

    setProfileState(null);

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userId!)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setProfileState({
          userId: userId!,
          role: null,
          error: error.message,
        });
        return;
      }

      if (
        data?.account_type !== "job-seeker" &&
        data?.account_type !== "recruiter"
      ) {
        setProfileState({
          userId: userId!,
          role: null,
          error: "No valid account type was found.",
        });
        return;
      }

      setProfileState({
        userId: userId!,
        role: data.account_type,
        error: "",
      });
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const auth = {
    session,
    authLoading,
    profileState,
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route
          path="/"
          element={<LandingPage />}
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            <PublicAuthRoute {...auth}>
              <LoginPage />
            </PublicAuthRoute>
          }
        />

        {/* Sign up */}
        <Route
          path="/signup"
          element={
            <PublicAuthRoute {...auth}>
              <SignupPage />
            </PublicAuthRoute>
          }
        />

        {/* ===================================
            JOB SEEKER WORKSPACE
            =================================== */}
        <Route
          element={
            <RoleRoute
              {...auth}
              requiredRole="job-seeker"
            >
              {session ? (
                <ApplicationLayout
                  key={session.user.id}
                  user={session.user}
                />
              ) : null}
            </RoleRoute>
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

          <Route
            path="/find-jobs"
            element={<FindJobsPage />}
          />

          <Route
            path="/applications"
            element={<ApplicationsPage />}
          />

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

          <Route
            path="/resumes"
            element={<ResumePage />}
          />

          <Route
            path="/profile"
            element={<ProfilePage />}
          />

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

        {/* ===================================
            RECRUITER WORKSPACE
            =================================== */}
        <Route
          element={
            <RoleRoute
              {...auth}
              requiredRole="recruiter"
            >
              {session ? (
                <RecruiterLayout
                  key={session.user.id}
                  user={session.user}
                />
              ) : null}
            </RoleRoute>
          }
        >
          <Route
            path="/recruiter"
            element={
              <Navigate
                to="/recruiter/jobs"
                replace
              />
            }
          />

          <Route
            path="/recruiter/jobs"
            element={<RecruiterJobsPage />}
          />

          <Route
            path="/recruiter/jobs/new"
            element={<CreateJobPage />}
          />

          <Route
            path="/recruiter/jobs/:jobId"
            element={<EditJobPage />}
          />

          <Route
            path="/recruiter/jobs/:jobId/applicants"
            element={<JobApplicantsPage />}
          />

          <Route
            path="/recruiter/profile"
            element={
              <PlaceholderPage
                eyebrow="Your recruiter account"
                title="Recruiter Profile"
                description="Manage your recruiter name, company information, and contact details."
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
