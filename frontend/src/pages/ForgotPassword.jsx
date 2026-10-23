import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_BASE_URL } from "../api";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setErrors({
      email: "",
      password: "",
      confirmPassword: "",
    });

    if (!email.trim()) {
      setErrors({
        email: "Email address is required.",
        password: "",
        confirmPassword: "",
      });
      return;
    }

    if (!password) {
      setErrors({
        email: "",
        password: "New password is required.",
        confirmPassword: "",
      });
      return;
    }

    if (!confirmPassword) {
      setErrors({
        email: "",
        password: "",
        confirmPassword:
          "Please confirm your new password.",
      });
      return;
    }

    const passwordPattern =
      /^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    if (!passwordPattern.test(password)) {
      setErrors({
        email: "",
        password:
          "Password must be at least 8 characters with one lowercase letter, one number and one special character.",
        confirmPassword: "",
      });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({
        email: "",
        password: "",
        confirmPassword: "Passwords do not match.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${BACKEND_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            new_password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 404 ||
          data.detail === "Email not registered"
        ) {
          setErrors({
            email: "Email address is not registered.",
            password: "",
            confirmPassword: "",
          });
          return;
        }

        setErrors({
          email: "",
          password:
            data.detail || "Password reset failed.",
          confirmPassword: "",
        });

        return;
      }

      navigate("/login");
    } catch (error) {
      console.error("Forgot password error:", error);

      setErrors({
        email: "",
        password: "Unable to connect to the server.",
        confirmPassword: "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          🛡️ CyberGuard <span>LIVE</span>
        </div>

        <div className="login-intro">
          <h1>
            Real-Time API
            <br />
            Security Monitoring
          </h1>

          <p>
            Monitor your APIs, detect security risks,
            and protect your digital services from a
            single centralized platform.
          </p>

          <div className="login-features">
            <div>✓ Real-time API monitoring</div>
            <div>✓ SSL certificate monitoring</div>
            <div>✓ Vulnerability detection</div>
            <div>✓ Automated security alerts</div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <div className="login-icon">🛡️</div>

          <h2>Forgot Password?</h2>

          <p>
            Enter your registered email and create a new password
          </p>

          <form onSubmit={handleResetPassword}>
            <label>Email Address</label>

            <input
              type="text"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);

                setErrors((previous) => ({
                  ...previous,
                  email: "",
                }));
              }}
            />

            {errors.email && (
              <div className="field-error">
                {errors.email}
              </div>
            )}

            <label>New Password</label>

            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);

                  setErrors((previous) => ({
                    ...previous,
                    password: "",
                  }));
                }}
              />

              <button
                type="button"
                className="eye-button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                    <path d="M9.88 4.24A9.77 9.77 0 0 1 12 4c5 0 9 4 10 8" />
                    <path d="M6.61 6.61C4.62 7.84 3.18 9.73 2 12c1 4 5 8 10 8 1.61 0 3.1-.38 4.42-1.05" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {errors.password && (
              <div className="field-error">
                {errors.password}
              </div>
            )}

            <small className="password-hint">
              Minimum 8 characters with lowercase letter,
              number and special character.
            </small>

            <label>Confirm New Password</label>

            <div className="password-input-wrapper">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);

                  setErrors((previous) => ({
                    ...previous,
                    confirmPassword: "",
                  }));
                }}
              />

              <button
                type="button"
                className="eye-button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                    <path d="M9.88 4.24A9.77 9.77 0 0 1 12 4c5 0 9 4 10 8" />
                    <path d="M6.61 6.61C4.62 7.84 3.18 9.73 2 12c1 4 5 8 10 8 1.61 0 3.1-.38 4.42-1.05" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {errors.confirmPassword && (
              <div className="field-error">
                {errors.confirmPassword}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Resetting Password..."
                : "Reset Password →"}
            </button>
          </form>

          <div className="register-login">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          </div>

          
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;