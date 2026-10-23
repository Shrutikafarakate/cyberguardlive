import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { getRegisteredApis } from "../api";

function Monitoring() {

  const [monitoringData, setMonitoringData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        setLoading(true);
        const response = await getRegisteredApis();
        const items = (response.data || []).map((api) => ({
          name: api.api_name,
          status: api.status === "ONLINE" ? "Online" : "Offline",
          response: api.response_time ? `${api.response_time} ms` : "Timeout",
          code: api.status_code ? String(api.status_code) : "N/A",
          uptime: api.uptime_percentage == null
            ? null
            : Number(api.uptime_percentage),
          lastChecked: api.last_checked
            ? new Date(api.last_checked).toLocaleString()
            : "Just now",
        }));
        setMonitoringData(items);
      } catch (error) {
        setMonitoringData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoringData();
    const intervalId = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const summary = useMemo(() => {
    const online = monitoringData.filter((api) => api.status === "Online").length;
    const offline = monitoringData.length - online;
    const avgResponse = monitoringData.length
      ? Math.round(
          monitoringData.reduce((total, api) => {
            const value = Number.parseInt(api.response, 10);
            return total + (Number.isNaN(value) ? 0 : value);
          }, 0) / monitoringData.length
        )
      : 0;
    const trackedApis = monitoringData.filter((api) => api.uptime !== null);
    const averageUptime = trackedApis.length
      ? trackedApis.reduce((total, api) => total + api.uptime, 0) / trackedApis.length
      : null;

    return { online, offline, avgResponse, averageUptime };
  }, [monitoringData]);

  return (

    <div className="app-layout">

      <Sidebar />

      <main className="main-content">

        <Topbar title="API Monitoring" />

        <div className="page-content">

          <div className="page-header">

            <div>

              <span className="page-label">
                REAL-TIME MONITORING
              </span>

              <h2>Monitoring Status</h2>

              <p>
                Real-time health and performance of your APIs.
              </p>

            </div>

            <span className="live-indicator">
              <span></span>
              LIVE MONITORING
            </span>

          </div>

          <div className="stat-grid">

            <div className="monitor-stat">

              <div className="monitor-stat-icon green-bg">
                ✓
              </div>

              <div>
                <strong>{summary.online}</strong>
                <p>APIs Online</p>
              </div>

            </div>

            <div className="monitor-stat">

              <div className="monitor-stat-icon red-bg">
                !
              </div>

              <div>
                <strong>{summary.offline}</strong>
                <p>APIs Offline</p>
              </div>

            </div>

            <div className="monitor-stat">

              <div className="monitor-stat-icon blue-bg">
                ⚡
              </div>

              <div>
                <strong>{summary.avgResponse} ms</strong>
                <p>Avg Response Time</p>
              </div>

            </div>

            <div className="monitor-stat">

              <div className="monitor-stat-icon purple-bg">
                %
              </div>

              <div>
                <strong>
                  {summary.averageUptime === null
                    ? "Collecting"
                    : `${summary.averageUptime.toFixed(1)}%`}
                </strong>
                <p>Average Uptime</p>
              </div>

            </div>

          </div>

          <div className="dashboard-card">

            <div className="card-header">

              <div>
                <h3>API Health Status</h3>
                <p>
                  Latest monitoring results
                </p>
              </div>

              {/* <span className="refresh-label">
                ↻ Auto refresh
              </span> */}

            </div>

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>API</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>HTTP Status</th>
                    <th>Uptime</th>
                    <th>Last Checked</th>
                  </tr>

                </thead>

                <tbody>

                  {loading && monitoringData.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                        Loading monitoring data...
                      </td>
                    </tr>
                  ) : (
                    monitoringData.map((api) => (

                    <tr key={api.name}>

                      <td>
                        <strong>{api.name}</strong>
                      </td>

                      <td>

                        <span
                          className={
                            api.status === "Online"
                              ? "status online"
                              : "status offline"
                          }
                        >
                          ● {api.status}
                        </span>

                      </td>

                      <td>
                        <span
                          className={
                            api.response === "Timeout"
                              ? "response-danger"
                              : "response-normal"
                          }
                        >
                          {api.response}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            api.code === "200"
                              ? "http-code success-code"
                              : "http-code error-code"
                          }
                        >
                          {api.code}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {api.uptime === null
                            ? "Collecting"
                            : `${api.uptime.toFixed(1)}%`}
                        </strong>
                      </td>

                      <td>
                        <span className="last-checked">
                          {api.lastChecked}
                        </span>
                      </td>

                    </tr>

                    ))
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Monitoring;