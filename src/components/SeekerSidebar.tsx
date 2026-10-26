import type { User } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type SeekerSidebarProps = {
  user: User;
  active: "applications" | "resumes" | "profile";
};

function SeekerSidebar({ user, active }: SeekerSidebarProps) {
  const navigate = useNavigate();
  const activeClass = (key: SeekerSidebarProps["active"]) =>
    active === key ? "sidebar-navigation__active" : undefined;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="dashboard-sidebar">
      <Link className="navbar__brand sidebar-brand" to="/">
        <span className="navbar__logo">CC</span>
        <span>CareerConnect</span>
      </Link>

      <nav className="sidebar-navigation">
        <a href="#">▦ <span>Dashboard</span></a>
        <a href="#">⌕ <span>Find Jobs</span></a>
        <Link className={activeClass("applications")} to="/applications">
          ▤ <span>My Applications</span>
        </Link>
        <a href="#">♡ <span>Saved Jobs</span></a>
        <Link className={activeClass("resumes")} to="/resumes">
          ▤ <span>My Résumés</span>
        </Link>
        <Link className={activeClass("profile")} to="/profile">
          ◉ <span>Profile</span>
        </Link>
        <a href="#">◷ <span>Notifications</span></a>
      </nav>

      <div className="sidebar-user">
        <div>
          <strong>{user.email}</strong>
        </div>
      </div>

      <button className="sidebar-signout" type="button" onClick={handleSignOut}>
        Sign out
      </button>
    </aside>
  );
}

export default SeekerSidebar;
