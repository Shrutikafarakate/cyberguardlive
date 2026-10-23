import { Link, useSearchParams } from "react-router-dom";
import { BACKEND_BASE_URL } from "../api";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
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
          </div>
        </div>
        <div className="login-right">
          <div className="login-box">
            <div className="login-icon">🛡️</div>
            <h2>Invalid Verification Link</h2>
            <p>This verification link is missing its token.</p>
            <Link to="/login">Return to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const verificationUrl = `${BACKEND_BASE_URL}/auth/verify-email?${new URLSearchParams({
    token,
  }).toString()}`;

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
        </div>
      </div>
      <div className="login-right">
        <div className="login-box">
          <div className="login-icon">🛡️</div>
          <h2>Verify Your Email</h2>
          <p>Confirm your email address to activate your CyberGuard Live account.</p>
          <form action={verificationUrl} method="post">
            <button type="submit">Verify Email</button>
          </form>
          <p>
            <Link to="/login">Return to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
