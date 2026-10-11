import { useState } from "react";
import axios from "axios";

function Register({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordChecks = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /[0-9]/.test(password) },
  ];

  const strength = passwordChecks.filter((check) => check.passed).length;

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    if (strength < 4) {
      setMessage("Please meet all password requirements.");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        {
          name: name.trim(),
          email: email.trim(),
          password,
        }
      );

      setIsSuccess(true);
      setMessage("Your account was created successfully. Please sign in.");

      // Keep the success message visible and return to login.
      window.setTimeout(() => {
        onLogin();
      }, 1800);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "We couldn't create your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="cv-auth-page">
      <div className="cv-auth-glow cv-auth-glow-one" />
      <div className="cv-auth-glow cv-auth-glow-two" />

      <section className="cv-auth-card cv-register-card">
        <div className="cv-auth-brand">
          <div className="cv-auth-logo" aria-hidden="true">☁</div>
          <span>Cloud<span className="cv-auth-brand-accent">Vault</span></span>
        </div>

        <div className="cv-auth-heading">
          <p className="cv-auth-eyebrow">YOUR SPACE IN THE CLOUD</p>
          <h1>Create your account</h1>
          <p>Keep your files organized, secure, and within reach.</p>
        </div>

        <form className="cv-auth-form" onSubmit={handleRegister}>
          <div className="cv-auth-field">
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
              required
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className="cv-auth-field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className="cv-auth-field">
            <label htmlFor="register-password">Create password</label>
            <div className="cv-auth-password-wrap">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isSubmitting || isSuccess}
              />
              <button
                className="cv-auth-toggle"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting || isSuccess}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {password.length > 0 && (
              <div className="cv-register-strength">
                <div className="cv-register-strength-bars" aria-label={`Password strength: ${strength} of 4 checks passed`}>
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={level <= strength ? "is-active" : ""}
                    />
                  ))}
                </div>
                <p>{strength === 4 ? "Password requirements met" : "Build a stronger password"}</p>
                <ul>
                  {passwordChecks.map((check) => (
                    <li key={check.label} className={check.passed ? "is-passed" : ""}>
                      <span aria-hidden="true">{check.passed ? "✓" : "○"}</span>
                      {check.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="cv-auth-field">
            <label htmlFor="register-confirm-password">Confirm password</label>
            <div className="cv-auth-password-wrap">
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting || isSuccess}
              />
              <button
                className="cv-auth-toggle"
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                disabled={isSubmitting || isSuccess}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {confirmPassword && (
              <p className={`cv-register-match ${password === confirmPassword ? "is-passed" : ""}`}>
                {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>

          {message && (
            <div className={isSuccess ? "cv-auth-success" : "cv-auth-error"} role="status">
              <span aria-hidden="true">{isSuccess ? "✓" : "!"}</span>
              {message}
            </div>
          )}

          <button
            className="cv-auth-submit"
            type="submit"
            disabled={isSubmitting || isSuccess}
          >
            {isSubmitting ? (
              <>
                <span className="cv-auth-spinner" />
                Creating account...
              </>
            ) : isSuccess ? (
              "Account created ✓"
            ) : (
              <>
                Create account <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <div className="cv-auth-divider">
          <span>SECURE FILE ACCESS</span>
        </div>

        <p className="cv-auth-switch">
          Already have an account?{" "}
          <button type="button" onClick={onLogin}>
            Sign in
          </button>
        </p>

        <p className="cv-auth-footer">
          Your files. Your space. Your control.
        </p>
      </section>
    </main>
  );
}

export default Register;
