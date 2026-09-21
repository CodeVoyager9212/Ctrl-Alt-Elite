import { useState } from "react";
import { Link } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // We will connect this to Supabase later.
    console.log({ email, password });
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
                minLength={6}
                required
              />
            </div>

            <button className="button button--primary auth-submit" type="submit">
              Log in
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;