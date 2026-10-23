import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRegisteredApis,
  getSecurityStatus,
  getUserAlerts,
  getUserActivity,
} from "../api";

function Dashboard() {
  const navigate = useNavigate();

  const adminName =
    localStorage.getItem("adminName") || "Administrator";

  const [apiData, setApiData] = useState([]);
  const [securityData, setSecurityData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        getRegisteredApis(),
        getSecurityStatus(),
        getUserAlerts(),
        getUserActivity(),
      ]);
      const [apisResult, securityResult, alertsResult, activityResult] = results;
      const errors = [];

      if (apisResult.status === "fulfilled") {
        setApiData(apisResult.value.data || []);
      } else {
        errors.push("API status");
      }

      if (securityResult.status === "fulfilled") {
        setSecurityData(securityResult.value.data || []);
      } else {
        errors.push("security score");
      }

      if (alertsResult.status === "fulfilled") {
        setAlerts(alertsResult.value.data || []);
      } else {
        errors.push("alerts");
      }

      if (activityResult.status === "fulfilled") {
        setActivity(activityResult.value.data || []);
      } else {
        errors.push("monitoring activity");
      }

      setDashboardError(
        errors.length
          ? `Unable to refresh ${errors.join(", ")}. Showing the latest available data.`
          : ""
      );
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const apiStats = useMemo(() => {
    const total = apiData.length;
    const online = apiData.filter((api) => api.status === "ONLINE").length;
    const offline = total - online;
    const averageResponse = total
      ? Math.round(
          apiData.reduce(
            (sum, api) => sum + (Number(api.response_time) || 0),
            0
          ) / total
        )
      : 0;
    const scores = securityData
      .map((api) => Number(api.score))
      .filter((score) => Number.isFinite(score));

    return {
      total,
      online,
      offline,
      securityScore: scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null,
      critical: scores.filter((score) => score < 50).length,
      warnings: securityData.reduce(
        (totalIssues, api) => totalIssues + (Number(api.vulnerabilities) || 0),
        0
      ),
      validSsl: securityData.filter((api) => api.ssl_valid).length,
      avgResponse: averageResponse,
    };
  }, [apiData, securityData]);

  const recentActivity = useMemo(() => {
    const alertActivity = alerts.map((alert) => ({
      title: alert.title || "Monitoring alert",
      description: alert.message || "A monitoring event was recorded.",
      time: alert.timestamp,
      type: alert.type === "critical" || alert.type === "warning"
        ? alert.type
        : "info",
      icon: alert.type === "critical" ? "!" : alert.type === "warning" ? "⚠" : "ℹ",
      id: alert.id || alert.timestamp,
    }));
    const recordedActivity = activity.map((event) => ({
      title: `${event.api_name || "API"} is ${event.status === "ONLINE" ? "online" : "offline"}`,
      description: event.status === "ONLINE"
        ? `Responded in ${Number(event.response_time) || 0} ms.`
        : `The health check failed${event.status_code ? ` (HTTP ${event.status_code})` : ""}.`,
      time: event.timestamp,
      type: event.status === "ONLINE" ? "success" : "critical",
      icon: event.status === "ONLINE" ? "✓" : "!",
      id: `${event.url}-${event.timestamp}`,
    }));
    const knownChecks = new Set(
      activity.map((event) => `${event.url}-${event.timestamp}`)
    );
    const legacyActivity = apiData
      .filter((api) => !knownChecks.has(`${api.url}-${api.last_checked}`))
      .map((api) => ({
        title: `${api.api_name || "API"} is ${api.status === "ONLINE" ? "online" : "offline"}`,
        description: api.status === "ONLINE"
          ? `Responded in ${Number(api.response_time) || 0} ms.`
          : `The latest health check failed${api.status_code ? ` (HTTP ${api.status_code})` : ""}.`,
        time: api.last_checked,
        type: api.status === "ONLINE" ? "success" : "critical",
        icon: api.status === "ONLINE" ? "✓" : "!",
        id: `${api.url}-${api.last_checked}`,
      }));

    return [...alertActivity, ...recordedActivity, ...legacyActivity]
      .sort((first, second) => {
        const firstTime = Date.parse(first.time || "") || 0;
        const secondTime = Date.parse(second.time || "") || 0;
        return secondTime - firstTime;
      })
      .map((activity) => ({
        ...activity,
        time: activity.time && Number.isFinite(Date.parse(activity.time))
          ? new Date(activity.time).toLocaleString()
          : "Recently",
      }));
  }, [alerts, apiData, activity]);

  const securityScoreColor =
    apiStats.securityScore === null
      ? "#ebe7fa"
      : apiStats.securityScore >= 80
        ? "#13a56d"
        : apiStats.securityScore >= 50
          ? "#e39a00"
          : "#e54848";

  return (
    <div className="dashboard">

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
            className="menu-item active"
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
            <h1>Dashboard</h1>

            <p>
              Real-time API security overview
            </p>
          </div>


          {/* ================= CLICKABLE PROFILE ================= */}

          <button
            className="admin-profile"
            type="button"
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

          </button>

        </header>


        {/* ================= DASHBOARD CONTENT ================= */}

        <div className="dashboard-content">

          {dashboardError && (
            <div role="status" className="dashboard-data-warning">
              {dashboardError}
            </div>
          )}

          {/* WELCOME */}

          <div className="welcome-section">

            <div>

              <h2>
                Welcome back, {adminName}
              </h2>

              <p>
                Here's what's happening with your APIs today.
              </p>

            </div>

            <div className="live-status">
              <span></span>
            </div>

          </div>


          {/* ================= STAT CARDS ================= */}

          <div className="stats-grid">

            {/* TOTAL APIs */}

            <div className="stat-card">

              <div className="stat-icon blue">
                ◈
              </div>

              <div className="stat-info">

                <p>Total APIs</p>

                <h3>
                  {apiStats.total}
                </h3>

                <span>
                  Registered APIs
                </span>

              </div>

            </div>


            {/* ONLINE */}

            <div className="stat-card">

              <div className="stat-icon green">
                ✓
              </div>

              <div className="stat-info">

                <p>APIs Online</p>

                <h3>
                  {apiStats.online}
                </h3>

                <span className="success-text">
                  Currently available
                </span>

              </div>

            </div>


            {/* OFFLINE */}

            <div className="stat-card">

              <div className="stat-icon red">
                !
              </div>

              <div className="stat-info">

                <p>APIs Offline</p>

                <h3>
                  {apiStats.offline}
                </h3>

                <span className="danger-text">
                  Requires attention
                </span>

              </div>

            </div>


            {/* SECURITY SCORE */}

            <div className="stat-card">

              <div className="stat-icon purple">
                ★
              </div>

              <div className="stat-info">

                <p>Security Score</p>

                <h3>
                  {apiStats.securityScore ?? "—"}
                  {apiStats.securityScore !== null && <small>/100</small>}
                </h3>

                <span>
                  {apiStats.securityScore === null ? "No security data yet" : "Average across monitored APIs"}
                </span>

              </div>

            </div>

          </div>


          {/* ================= SECOND ROW ================= */}

          <div className="dashboard-grid">

            {/* API HEALTH */}

            <div className="dashboard-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    API Health Overview
                  </h3>

                  <p>
                    Current status of monitored APIs
                  </p>

                </div>

                <button
                  onClick={() =>
                    navigate("/monitoring")
                  }
                >
                  View Monitoring →
                </button>

              </div>


              <div className="health-content">

                <div
                    className="health-circle"
                    style={{
                      "--health-percent": `${
                        apiStats.total
                          ? Math.round(
                              (apiStats.online / apiStats.total) * 100
                            )
                          : 0
                      }%`,
                    }}
                  >
                    <strong>
                      {apiStats.total
                        ? Math.round(
                            (apiStats.online / apiStats.total) * 100
                          )
                        : 0}
                      %
                    </strong>
                  </div>


                <div className="health-details">

                  <div className="health-item">

                    <span className="health-dot online-dot"></span>

                    <div>

                      <strong>
                        {apiStats.online}
                      </strong>

                      <small>
                        APIs Online
                      </small>

                    </div>

                  </div>


                  <div className="health-item">

                    <span className="health-dot offline-dot"></span>

                    <div>

                      <strong>
                        {apiStats.offline}
                      </strong>

                      <small>
                        APIs Offline
                      </small>

                    </div>

                  </div>


                  <div className="health-item">

                    <span className="health-dot warning-dot"></span>

                    <div>

                      <strong>
                        {apiStats.avgResponse} ms
                      </strong>

                      <small>
                        Avg Response
                      </small>

                    </div>

                  </div>

                </div>

              </div>

            </div>


            {/* SECURITY OVERVIEW */}

            <div className="dashboard-panel">

              <div className="panel-header">

                <div>

                  <h3>
                    Security Overview
                  </h3>

                  <p>
                    Latest security status
                  </p>

                </div>

                <button
                  onClick={() =>
                    navigate("/security")
                  }
                >
                  View Security →
                </button>

              </div>


              <div className="security-dashboard">

                <div
                  className="security-score-circle"
                  style={{
                    "--security-score": `${apiStats.securityScore ?? 0}%`,
                    "--security-score-color": securityScoreColor,
                  }}
                  role="img"
                  aria-label={
                    apiStats.securityScore === null
                      ? "Security score unavailable"
                      : `Security score ${apiStats.securityScore}%`
                  }
                >

                  <strong>
                    {apiStats.securityScore === null
                      ? "—"
                      : `${apiStats.securityScore}%`}
                  </strong>

                  {apiStats.securityScore !== null && (
                    <span>Security score</span>
                  )}

                </div>


                <div className="security-status-text">

                  <h3>
                    {apiStats.securityScore === null ? "No Security Data" : "Security Assessment"}
                  </h3>

                  <p>
                    {apiStats.securityScore === null
                      ? "Security information will appear here after APIs are registered."
                      : `Average security score across ${securityData.length} monitored API${securityData.length === 1 ? "" : "s"}.`}
                  </p>


                  <div className="security-mini-stats">

                    <div>
                      <strong>{apiStats.critical}</strong>
                      <span>Critical</span>
                    </div>

                    <div>
                      <strong>{apiStats.warnings}</strong>
                      <span>Warnings</span>
                    </div>

                    <div>
                      <strong>{apiStats.validSsl}</strong>
                      <span>SSL Valid</span>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* ================= RECENT ACTIVITY ================= */}

          <div className="dashboard-panel activity-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Recent Activity
                </h3>

                <p>
                  Latest monitoring and security events
                </p>

              </div>

              <button
                onClick={() =>
                  navigate("/reports")
                }
              >
                View Reports →
              </button>

            </div>


            <div className="activity-list">

              {recentActivity.length === 0 ? (

                <div className="no-activity">
                  No recent activity available.
                </div>

              ) : (

                recentActivity.map(
                  (activity, index) => (

                    <div
                      className={`activity-item ${activity.type}`}
                      key={index}
                    >

                      <div
                        className={`activity-icon ${activity.type}`}
                      >
                        {activity.icon}
                      </div>

                      <div className="activity-info">

                        <strong>
                          {activity.title}
                        </strong>

                        <p>
                          {activity.description}
                        </p>

                      </div>

                      <span className="activity-time">
                        {activity.time}
                      </span>

                    </div>

                  )
                )

              )}

            </div>

          </div>


          {/* ================= QUICK ACTIONS ================= */}

          <div className="quick-actions">

            <h3>
              Quick Actions
            </h3>

            <div className="quick-action-grid">

              <button
                onClick={() =>
                  navigate("/api-management")
                }
              >

                <span>＋</span>

                <div>

                  <strong>
                    Add New API
                  </strong>

                  <small>
                    Register an API for monitoring
                  </small>

                </div>

              </button>


              <button
                onClick={() =>
                  navigate("/monitoring")
                }
              >

                <span>◉</span>

                <div>

                  <strong>
                    View Monitoring
                  </strong>

                  <small>
                    Check API health and performance
                  </small>

                </div>

              </button>


              <button
                onClick={() =>
                  navigate("/security")
                }
              >

                <span>🛡️</span>

                <div>

                  <strong>
                    Security Check
                  </strong>

                  <small>
                    Review vulnerabilities and SSL
                  </small>

                </div>

              </button>


              <button
                onClick={() =>
                  navigate("/alerts")
                }
              >

                <span>🔔</span>

                <div>

                  <strong>
                    View Alerts
                  </strong>

                  <small>
                    Check security notifications
                  </small>

                </div>

              </button>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Dashboard;