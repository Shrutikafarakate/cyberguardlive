import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAccount } from "../api";

function Profile() {
  const navigate = useNavigate();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const adminName =
    localStorage.getItem("adminName") || "Administrator";

  const adminEmail =
    localStorage.getItem("adminEmail") || "Not available";

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("accessToken");

    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently? Your APIs, alerts, and monitoring history will also be deleted."
    );
    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    setDeleteError("");

    try {
      await deleteAccount();
      handleLogout();
    } catch (error) {
      setDeleteError(
        error.response?.data?.detail || "Failed to delete your account."
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="profile-page">

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

        <div className="sidebar-logo">

          <div className="logo-shield">
            🛡️
          </div>

          <div>
            <h2>CyberGuard</h2>
            <span>LIVE</span>
          </div>

        </div>

        <nav className="sidebar-menu">

          <button
            className="menu-item"
            onClick={() => navigate("/dashboard")}
          >
            <span>▣</span>
            Dashboard
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/api-management")}
          >
            <span>◈</span>
            API Management
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/monitoring")}
          >
            <span>◉</span>
            Monitoring
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/security")}
          >
            <span>🔒</span>
            Security
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/reports")}
          >
            <span>▤</span>
            Reports
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/alerts")}
          >
            <span>🔔</span>
            Alerts
          </button>

        </nav>

        

      </aside>

      {/* ================= MAIN CONTENT ================= */}

      <main className="dashboard-main">

        {/* TOPBAR */}

        <header className="dashboard-topbar">

          <div>
            <h1>My Profile</h1>

            <p>
              View your CyberGuard Live account information
            </p>
          </div>

          <div
            className="admin-profile"
            onClick={() => navigate("/profile")}
          >

            <div className="profile-icon">
              {adminName.charAt(0).toUpperCase()}
            </div>

            <div className="profile-details">

              <strong>
                {adminName}
              </strong>

              <small>
                Administrator
              </small>

            </div>

          </div>

        </header>

        {/* ================= PROFILE CONTENT ================= */}

        <div className="profile-content">

          <div className="profile-card">

            <div className="profile-header">

              <div className="large-profile-icon">
                {adminName.charAt(0).toUpperCase()}
              </div>

              <div>

                <h2>
                  {adminName}
                </h2>

                <p>
                  Administrator
                </p>

              </div>

            </div>

            <div className="profile-divider"></div>

            <div className="profile-information">

              <div className="profile-info-item">

                <span className="profile-info-icon">
                  👤
                </span>

                <div>
                  <small>Full Name</small>
                  <strong>{adminName}</strong>
                </div>

              </div>

              <div className="profile-info-item">

                <span className="profile-info-icon">
                  ✉️
                </span>

                <div>
                  <small>Email Address</small>
                  <strong>{adminEmail}</strong>
                </div>

              </div>

              <div className="profile-info-item">

                <span className="profile-info-icon">
                  🛡️
                </span>

                <div>
                  <small>Role</small>
                  <strong>Administrator</strong>
                </div>

              </div>

              <div className="profile-info-item">

                <span className="profile-info-icon">
                  ✓
                </span>

                <div>
                  <small>Account Status</small>
                  <strong className="profile-active">
                    Active
                  </strong>
                </div>

              </div>

            </div>

            <div className="profile-actions">

              <button
                className="profile-delete-btn"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? "Deleting..." : "Delete Account"}
              </button>

              <button
                className="profile-back-btn"
                onClick={() => navigate("/dashboard")}
              >
                ← Back to Dashboard
              </button>

              <button
                className="profile-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>

            </div>
            {deleteError && (
              <p className="profile-delete-error" role="alert">
                {deleteError}
              </p>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}

export default Profile;
