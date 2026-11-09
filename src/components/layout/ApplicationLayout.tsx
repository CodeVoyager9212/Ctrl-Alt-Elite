import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import NotificationBell from "../notifications/NotificationBell";
import "./ApplicationLayout.css";

type AccountType = "job-seeker" | "recruiter";

type AccountSummary = {
  fullName: string;
  accountType: AccountType;
};

export type ApplicationOutletContext = {
  user: User;
  updateAccountSummary: (summary: AccountSummary) => void;
};

type ApplicationLayoutProps = {
  user: User;
};

const NAVIGATION_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: "▦" },
  { label: "Find Jobs", path: "/find-jobs", icon: "⌕" },
  { label: "My Applications", path: "/applications", icon: "▤" },
  { label: "Saved Jobs", path: "/saved-jobs", icon: "♡" },
  { label: "My Résumés", path: "/resumes", icon: "▤" },
  { label: "Profile", path: "/profile", icon: "◉" },
] as const;

function getInitialAccountSummary(user: User): AccountSummary {
  const metadataName = user.user_metadata.full_name;

  return {
    fullName: typeof metadataName === "string" ? metadataName.trim() : "",
    accountType:
      user.user_metadata.account_type === "recruiter"
        ? "recruiter"
        : "job-seeker",
  };
}

export default function ApplicationLayout({ user }: ApplicationLayoutProps) {
  const [accountSummary, setAccountSummary] = useState(() =>
    getInitialAccountSummary(user),
  );
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    void supabase
      .from("profiles")
      .select("full_name, account_type")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) {
          setAccountSummary({
            fullName: data.full_name,
            accountType: data.account_type,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  const initials = accountSummary.fullName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    if (signingOut) return;

    setSignOutError("");
    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setSignOutError(error.message);
        return;
      }

      navigate("/login", { replace: true });
    } catch {
      setSignOutError(
        "Unable to reach the authentication service. Please try again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="application-layout">
      <aside className="application-sidebar">
        <div className="sidebar-top">
          <Link className="navbar__brand sidebar-brand" to="/dashboard">
            <span className="navbar__logo">CC</span>
            <span>CareerConnect</span>
          </Link>

          <NotificationBell userId={user.id} />
        </div>

        <nav className="sidebar-navigation" aria-label="Application navigation">
          {NAVIGATION_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-navigation__active" : undefined
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="sidebar-initials">{initials || "CC"}</span>
          <div>
            <strong>{user.email}</strong>
            <span>
              {accountSummary.accountType === "recruiter"
                ? "Recruiter"
                : "Job seeker"}
            </span>
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
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </aside>

      <div className="application-content">
        <Outlet
          context={{ user, updateAccountSummary: setAccountSummary }}
        />
      </div>
    </div>
  );
}
