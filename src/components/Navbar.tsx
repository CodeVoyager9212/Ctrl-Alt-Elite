import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header className="navbar">
      <Link className="navbar__brand" to="/">
        <span className="navbar__logo">CC</span>
        <span>CareerConnect</span>
      </Link>

      <nav className="navbar__links" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#recruiters">For recruiters</a>
      </nav>

      <div className="navbar__actions">
        <Link className="button button--login" to="/login">
          Log in
        </Link>

        <Link className="button button--primary" to="/signup">
          Create account
        </Link>
      </div>
    </header>
  );
}

export default Navbar;