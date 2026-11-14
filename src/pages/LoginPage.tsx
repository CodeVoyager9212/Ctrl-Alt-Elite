import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setErrorMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          setErrorMessage("The email or password is incorrect.");
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMessage("Please confirm your email before logging in.");
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch {
      setErrorMessage(
        "Unable to reach the authentication service. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <Link className="navbar__brand" to="/">
          <span className="navbar__logo">CC</span>
          <span>CareerConnect</span>
        </Link>

        <Link className="auth-navbar__link" to="/signup">
          Create account
        </Link>
      </header>

      <main className="auth-container">
        <section className="auth-card">
          <p className="auth-card__eyebrow">Welcome back</p>
          <h1>Log in to CareerConnect</h1>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={loading}
                minLength={6}
                required
              />
            </div>

            {errorMessage && (
              <p className="auth-message auth-message--error" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="button button--primary auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
