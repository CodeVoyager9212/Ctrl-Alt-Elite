import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type AccountType = "job-seeker" | "recruiter";

function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType>("job-seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    setErrorMessage("");
    setSuccessMessage("");

    if (!normalizedName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            account_type: accountType,
          },
          emailRedirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        if (error.code === "user_already_exists") {
          setErrorMessage(
            "Unable to create an account with those details. Try logging in or use a different email.",
          );
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data.session) {
        navigate("/profile", { replace: true });
        return;
      }

      setSuccessMessage(
        "Check your email for a confirmation link. If you already have an account, log in instead.",
      );
      setPassword("");
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
                autoComplete="name"
                disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                autoComplete="email"
                disabled={loading}
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
                autoComplete="new-password"
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

            {successMessage && (
              <p className="auth-message auth-message--success" role="status">
                {successMessage}
              </p>
            )}

            <button
              className="button button--primary auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default SignupPage;
