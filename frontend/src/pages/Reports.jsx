import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { getRegisteredApis, getSecurityStatus, getUserAlerts } from "../api";

function Reports() {
  const [downloading, setDownloading] = useState(false);

  const downloadCSV = (filename, headers, rows) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPerformanceReport = async () => {
    try {
      setDownloading(true);
      const res = await getRegisteredApis();
      const apis = res.data || [];
      const headers = ["API Name", "URL", "Method", "Status", "Status Code", "Response Time (ms)", "Uptime %", "Last Checked"];
      const rows = apis.map((api) => [
        api.api_name,
        api.url,
        api.method || "GET",
        api.status,
        api.status_code || "N/A",
        api.response_time || 0,
        api.uptime_percentage ? api.uptime_percentage.toFixed(1) : "N/A",
        api.last_checked || "N/A",
      ]);
      downloadCSV(`API_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (err) {
      alert("Failed to export performance report: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const exportSecurityReport = async () => {
    try {
      setDownloading(true);
      const res = await getSecurityStatus();
      const securityData = res.data || [];
      const headers = ["API Name", "URL", "SSL Status", "Certificate Expiry", "Days Remaining", "Vulnerabilities", "Security Score"];
      const rows = securityData.map((item) => [
        item.api_name,
        item.url,
        item.ssl_status,
        item.expiry,
        item.days_remaining,
        item.vulnerabilities,
        item.score,
      ]);
      downloadCSV(`API_Security_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (err) {
      alert("Failed to export security report: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const exportAlertsReport = async () => {
    try {
      setDownloading(true);
      const res = await getUserAlerts();
      const alerts = res.data || [];
      const headers = ["Timestamp", "Severity", "Title", "Message", "API URL"];
      const rows = alerts.map((item) => [
        item.timestamp,
        item.type,
        item.title,
        item.message,
        item.api_url || "N/A",
      ]);
      downloadCSV(`API_Alerts_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (err) {
      alert("Failed to export alerts report: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Topbar title="Reports" />

        <div className="page-content">
          {/* Page Header */}
          <div className="page-header">
            <div>
              <span className="page-label">ANALYTICS</span>
              <h2>Monitoring Reports</h2>
              <p>Generate and download CSV reports on API health, SSL security posture, and incidents.</p>
            </div>

            <button
              className="primary-button"
              onClick={exportPerformanceReport}
              disabled={downloading}
            >
              {downloading ? "Exporting..." : "↓ Export All Data (CSV)"}
            </button>
          </div>

          {/* Report Cards */}
          <div className="report-grid">
            {/* API Performance Report */}
            <div className="report-card">
              <div className="report-title-row">
                <div className="report-icon blue-report">📊</div>
                <h3>API Performance Report</h3>
              </div>
              <p>Response time, uptime percentages, and status history CSV export.</p>
              <button onClick={exportPerformanceReport} disabled={downloading}>
                Download Performance CSV →
              </button>
            </div>

            {/* Security Report */}
            <div className="report-card">
              <div className="report-title-row">
                <div className="report-icon purple-report">🛡️</div>
                <h3>Security Report</h3>
              </div>
              <p>SSL certificate expiration dates, vulnerability checks, and security scores.</p>
              <button onClick={exportSecurityReport} disabled={downloading}>
                Download Security CSV →
              </button>
            </div>

            {/* Alert Report */}
            <div className="report-card">
              <div className="report-title-row">
                <div className="report-icon orange-report">🔔</div>
                <h3>Alert Report</h3>
              </div>
              <p>Full history of availability downtime incidents and latency alerts.</p>
              <button onClick={exportAlertsReport} disabled={downloading}>
                Download Alerts CSV →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Reports;