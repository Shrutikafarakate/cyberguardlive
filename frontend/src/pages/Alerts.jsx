import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { getUserAlerts, clearUserAlerts } from "../api";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await getUserAlerts();
      setAlerts(response.data || []);
    } catch (error) {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const intervalId = setInterval(fetchAlerts, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const removeAlert = (id) => {
    setAlerts((previous) => previous.filter((alert) => alert.id !== id));
  };

  const markAllRead = async () => {
    try {
      await clearUserAlerts();
      setAlerts([]);
    } catch (error) {
      console.error("Failed to clear alerts:", error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Topbar title="Alerts & Notifications" />

        <div className="page-content">
          {/* Page Header */}
          <div className="page-header alerts-page-header">
            <div className="alerts-heading">
              <h2>Alerts</h2>
              <p>Monitor important API security and availability events.</p>
            </div>

            {alerts.length > 0 && (
              <button
                className="secondary-button alert-read-button"
                onClick={markAllRead}
              >
                <span className="button-icon">✓</span>
                Mark All as Read
              </button>
            )}
          </div>

          {/* Alert Content */}
          {loading && alerts.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
              Loading system alerts...
            </div>
          ) : alerts.length > 0 ? (
            <div className="alerts-container">
              {alerts.map((alert) => (
                <div
                  className={`alert-card ${alert.type || "info"}`}
                  key={alert.id || alert.timestamp}
                >
                  {/* Alert Icon */}
                  <div className="alert-icon-wrapper">
                    <div className="alert-icon">
                      {alert.type === "critical" && "!"}
                      {alert.type === "warning" && "⚠"}
                      {alert.type === "info" && "ℹ"}
                      {(!alert.type || alert.type === "success") && "✓"}
                    </div>
                  </div>

                  {/* Alert Content */}
                  <div className="alert-content">
                    <div className="alert-title-row">
                      <div className="alert-title-section">
                        <h3>{alert.title}</h3>
                        <span className={`alert-status ${alert.type || "info"}`}>
                          {alert.type || "info"}
                        </span>
                      </div>

                      <span className="alert-time">{formatTime(alert.timestamp)}</span>
                    </div>

                    <p>{alert.message}</p>
                  </div>

                  {/* Close Button */}
                  <button
                    className="close-alert"
                    onClick={() => removeAlert(alert.id)}
                    title="Remove alert"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="empty-alerts">
              <div className="empty-alert-icon">✓</div>
              <span className="empty-alert-label">ALL CLEAR</span>
              <h3>No New Alerts</h3>
              <p>You're all caught up. New API events and health alerts will appear here.</p>
              <div className="empty-alert-line"></div>
              <small>
                Your API monitoring system is active and scanning for downtime or high latency.
              </small>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Alerts;