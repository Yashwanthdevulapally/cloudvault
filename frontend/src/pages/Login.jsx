import { useState } from "react";
import axios from "axios";

function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          email: email.trim(),
          password,
        }
      );

      localStorage.setItem("token", response.data.token);
      onLogin();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to sign in. Please check your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="cv-auth-page">
      <div className="cv-auth-glow cv-auth-glow-one" />
      <div className="cv-auth-glow cv-auth-glow-two" />

      <section className="cv-auth-card">
        <div className="cv-auth-brand">
          <div className="cv-auth-logo" aria-hidden="true">
            ☁
          </div>
          <span>Cloud<span className="cv-auth-brand-accent">Vault</span></span>
        </div>

        <div className="cv-auth-heading">
          <p className="cv-auth-eyebrow">YOUR PERSONAL CLOUD</p>
          <h1>Welcome back</h1>
          <p>Sign in to access your files, anywhere.</p>
        </div>

        <form className="cv-auth-form" onSubmit={handleLogin}>
          <div className="cv-auth-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="cv-auth-field">
            <div className="cv-auth-label-row">
              <label htmlFor="login-password">Password</label>
            </div>

            <div className="cv-auth-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />

              <button
                className="cv-auth-toggle"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {message && (
            <div className="cv-auth-error" role="alert">
              <span aria-hidden="true">!</span>
              {message}
            </div>
          )}

          <button
            className="cv-auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="cv-auth-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign in <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <div className="cv-auth-divider">
          <span>SECURE FILE ACCESS</span>
        </div>

        <p className="cv-auth-switch">
          New to CloudVault?{" "}
          <button type="button" onClick={onRegister}>
            Create an account
          </button>
        </p>

        <p className="cv-auth-footer">
          Your files. Your space. Your control.
        </p>
      </section>
    </main>
  );
}

export default Login;
