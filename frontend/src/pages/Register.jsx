import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_BASE_URL } from "../api";

function Register() {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
    setSuccessMessage("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    if (!form.name.trim()) {
      newErrors.name = "Full name is required.";
    } else if (form.name.trim().length < 3) {
      newErrors.name =
        "Full name must contain at least 3 characters.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email address is required.";
    } else {
      const emailPattern =
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (
        !emailPattern.test(form.email.trim()) ||
        emailInputRef.current?.validity.typeMismatch
      ) {
        newErrors.email =
          "Please enter a valid email address.";
      }
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else {
      const passwordPattern =
        /^(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

      if (!passwordPattern.test(form.password)) {
        newErrors.password =
          "Password must contain at least 8 characters, one lowercase letter, one number and one special character.";
      }
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (
      form.password !== form.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(newErrors);

    if (
      newErrors.name ||
      newErrors.email ||
      newErrors.password ||
      newErrors.confirmPassword
    ) {
      return;
    }

    setSuccessMessage("");

    try {
      setLoading(true);

      const response = await fetch(
        `${BACKEND_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const details = Array.isArray(data.detail)
          ? data.detail
          : [];
        const emailValidationError = details.find(
          (detail) =>
            Array.isArray(detail.loc) &&
            detail.loc.includes("email")
        );
        const message =
          typeof data.detail === "string"
            ? data.detail
            : emailValidationError?.msg ||
              details
                .map((detail) => detail.msg)
                .filter((detail) => typeof detail === "string")
                .join(" ") ||
              "Registration failed. Please try again.";

        if (
          emailValidationError ||
          message.toLowerCase().includes("email") ||
          message.toLowerCase().includes("already") ||
          message.toLowerCase().includes("user")
        ) {
          setErrors({
            name: "",
            email: message,
            password: "",
            confirmPassword: "",
          });
        } else {
          setErrors({
            name: "",
            email: "",
            password: message,
            confirmPassword: "",
          });
        }

        return;
      }

      if (
        typeof data.message !== "string" ||
        !data.message.trim() ||
        typeof data.email !== "string" ||
        !data.email.trim()
      ) {
        setErrors({
          name: "",
          email: "",
          password: "Registration failed. Please try again.",
          confirmPassword: "",
        });
        return;
      }

      setSuccessMessage(data.message);
    } catch (error) {
      console.error("Registration error:", error);

      setErrors({
        name: "",
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

          <h2>Create Account</h2>

          <p>
            Register your CyberGuard Live administrator account
          </p>

          {successMessage && (
            <div role="status" className="field-success">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleRegister} noValidate>
            <label>Full Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
            />

            {errors.name && (
              <div className="field-error">
                {errors.name}
              </div>
            )}

            <label>Email Address</label>

            <input
              ref={emailInputRef}
              type="email"
              name="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={handleChange}
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
                name="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
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
              Uppercase is optional.
            </small>

            <label>Confirm Password</label>

            <div className="password-input-wrapper">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                name="confirmPassword"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
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
                ? "Creating Account..."
                : "Create Account →"}
            </button>
          </form>

          <div className="register-login">
            Already have an account?{" "}
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

export default Register;