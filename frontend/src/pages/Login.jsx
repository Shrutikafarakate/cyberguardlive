import { useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { BACKEND_BASE_URL } from "../api";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailInputRef = useRef(null);
  const verificationStatus = searchParams.get("verified");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrors({
      email: "",
      password: "",
    });

    if (!email.trim()) {
      setErrors({
        email: "Email address is required.",
        password: "",
      });
      return;
    }

    if (emailInputRef.current?.validity.typeMismatch) {
      setErrors({
        email: "Enter a valid email address.",
        password: "",
      });
      return;
    }

    if (!password) {
      setErrors({
        email: "",
        password: "Password is required.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${BACKEND_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422) {
          setErrors({
            email: "Enter a valid email address.",
            password: "",
          });
          return;
        }

        if (response.status === 404) {
          setErrors({
            email: "Email address is not registered.",
            password: "",
          });
          return;
        }

        if (response.status === 401) {
          setErrors({
            email: "",
            password: "Incorrect password.",
          });
          return;
        }

        setErrors({
          email: "",
          password:
            typeof data.detail === "string"
              ? data.detail
              : "Login failed.",
        });

        return;
      }

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("adminName", data.name);
      localStorage.setItem("adminEmail", data.email);
      localStorage.setItem("accessToken", data.access_token);

      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      setErrors({
        email: "",
        password: "Unable to connect to the server.",
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

          <h2>Welcome Back</h2>

          <p>
            Sign in to your CyberGuard Live administrator account
          </p>

          {verificationStatus === "1" && (
            <div role="status" className="field-success">
              <strong>Email Verified Successfully!</strong>
              <br />
              Your CyberGuard Live account has been verified successfully. You can now sign in below.
            </div>
          )}

          {verificationStatus === "0" && (
            <div role="alert" className="field-error">
              This verification link is invalid or expired. Register again to receive a new link.
            </div>
          )}

          {verificationStatus === "already" && (
            <div role="status" className="field-success">
              This verification link has already been used. You can sign in to your account below.
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <label>Email Address</label>

            <input
              ref={emailInputRef}
              type="email"
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

            <label>Password</label>

            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
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

            <div className="forgot-password">
              <Link to="/forgot-password">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In →"}
            </button>
          </form>

          <div className="register-login">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
            >
              Create Account
            </button>
          </div>

          
        </div>
      </div>
    </div>
  );
}

export default Login;