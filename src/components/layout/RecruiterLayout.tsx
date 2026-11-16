
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { supabase } from "../../lib/supabase";
import NotificationBell from "../notifications/NotificationBell";
import "./ApplicationLayout.css";

type RecruiterLayoutProps = {
  user: User;
};

const RECRUITER_NAVIGATION = [
  {
    label: "My Job Postings",
    path: "/recruiter/jobs",
    icon: "▦",
  },
  {
    label: "Create Job",
    path: "/recruiter/jobs/new",
    icon: "+",
  },
  { label: "Notifications", path: "/recruiter/notifications", icon: "◷" },
  {
    label: "Profile",
    path: "/recruiter/profile",
    icon: "◉",
  },
] as const;

export default function RecruiterLayout({
  user,
}: RecruiterLayoutProps) {
  const [fullName, setFullName] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (active && data) {
        setFullName(data.full_name);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user.id]);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setSignOutError(error.message);
        return;
      }

      navigate("/login", { replace: true });
    } catch {
      setSignOutError(
        "Unable to sign out. Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="application-layout">
      <aside className="application-sidebar">
        <div className="sidebar-brand-row">
          <Link
            className="navbar__brand sidebar-brand"
            to="/recruiter/jobs"
          >
            <span className="navbar__logo">CC</span>
            <span>CareerConnect</span>
          </Link>
          <NotificationBell userId={user.id} inboxPath="/recruiter/notifications" />
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Recruiter navigation"
        >
          {RECRUITER_NAVIGATION.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/recruiter/jobs"}
              className={({ isActive }) =>
                isActive
                  ? "sidebar-navigation__active"
                  : undefined
              }
            >
              <span aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="sidebar-initials">
            {initials || "CC"}
          </span>

          <div>
            <strong>{user.email}</strong>
            <span>Recruiter</span>
          </div>
        </div>

        {signOutError && (
          <p className="sidebar-error" role="alert">
            {signOutError}
          </p>
        )}

        <button
          className="sidebar-signout"
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </aside>

      <div className="application-content">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
}
