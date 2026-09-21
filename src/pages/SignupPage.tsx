import { useState } from "react";
import { Link } from "react-router-dom";

type AccountType = "job-seeker" | "recruiter";

function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType>("job-seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // We will send this information to Supabase later.
    console.log({
      fullName,
      accountType,
      email,
      password,
    });
  }

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <Link className="navbar__brand" to="/">
          <span className="navbar__logo">CC</span>
          <span>CareerConnect</span>
        </Link>

        <Link className="auth-navbar__link" to="/login">
          Log in
        </Link>
      </header>

      <main className="auth-container">
        <section className="auth-card">
          <p className="auth-card__eyebrow">New folder</p>
          <h1>Create your account</h1>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="full-name">Full name</label>

              <input
                id="full-name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>

            <fieldset className="account-type">
              <legend>I am a</legend>

              <div className="account-type__options">
                <button
                  className={`account-type__button ${
                    accountType === "job-seeker"
                      ? "account-type__button--active"
                      : ""
                  }`}
                  type="button"
                  onClick={() => setAccountType("job-seeker")}
                >
                  Job seeker
                </button>

                <button
                  className={`account-type__button ${
                    accountType === "recruiter"
                      ? "account-type__button--active"
                      : ""
                  }`}
                  type="button"
                  onClick={() => setAccountType("recruiter")}
                >
                  Recruiter
                </button>
              </div>
            </fieldset>

            <div className="form-group">
              <label htmlFor="signup-email">Email</label>

              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password">Password</label>

              <input
                id="signup-password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>

            <button className="button button--primary auth-submit" type="submit">
              Create account
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default SignupPage;