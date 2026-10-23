import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { getSecurityStatus } from "../api";

function Security() {
  const [securityData, setSecurityData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        setLoading(true);
        const response = await getSecurityStatus();
        setSecurityData(response.data || []);
      } catch (error) {
        setSecurityData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurity();
    const intervalId = setInterval(fetchSecurity, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const summary = useMemo(() => {
    if (!securityData.length) {
      return {
        avgScore: 0,
        validSsl: 0,
        vulnerabilities: 0,
        expiringSoon: 0,
      };
    }

    const totalScore = securityData.reduce((acc, item) => acc + (item.score || 0), 0);
    const avgScore = Math.round(totalScore / securityData.length);
    const validSsl = securityData.filter((item) => item.ssl_valid).length;
    const vulnerabilities = securityData.reduce((acc, item) => acc + (item.vulnerabilities || 0), 0);
    const expiringSoon = securityData.filter((item) => item.ssl_status === "Expiring Soon").length;

    return { avgScore, validSsl, vulnerabilities, expiringSoon };
  }, [securityData]);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Topbar title="Security Monitoring" />

        <div className="page-content">
          <div className="page-header">
            <div>
              <span className="page-label">SECURITY CENTER</span>
              <h2>API Security</h2>
              <p>Monitor SSL certificates, header security posture and vulnerability risks.</p>
            </div>
          </div>

          <div className="security-summary">
            <div className="security-box">
              <div className="security-top">
                <span className="security-box-icon">🛡️</span>
                <h3>{summary.avgScore}%</h3>
              </div>
              <p>Overall Security Score</p>
            </div>

            <div className="security-box">
              <div className="security-top">
                <span className="security-box-icon">🔐</span>
                <h3>{summary.validSsl}</h3>
              </div>
              <p>Valid SSL Certificates</p>
            </div>

            <div className="security-box warning">
              <div className="security-top">
                <span className="security-box-icon">⚠️</span>
                <h3>{summary.vulnerabilities}</h3>
              </div>
              <p>Vulnerabilities & Missing Headers</p>
            </div>

            <div className="security-box">
              <div className="security-top">
                <span className="security-box-icon">⏳</span>
                <h3>{summary.expiringSoon}</h3>
              </div>
              <p>SSL Expiring Soon (&lt; 30d)</p>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3>Security Status</h3>
                <p>Security analysis and certificate metrics for registered APIs</p>
              </div>
              <span className="security-live">● SECURITY ACTIVE</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>API Name</th>
                    <th>SSL Status</th>
                    <th>Certificate Expiry</th>
                    <th>Security Assessment</th>
                    <th>Security Score</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && securityData.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                        Analyzing security posture...
                      </td>
                    </tr>
                  ) : securityData.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                        No registered APIs to inspect. Register APIs in API Management to monitor security.
                      </td>
                    </tr>
                  ) : (
                    securityData.map((api) => (
                      <tr key={api.url}>
                        <td>
                          <strong>{api.api_name}</strong>
                          <br />
                          <small style={{ color: "#888" }}>{api.url}</small>
                        </td>

                        <td>
                          <span
                            className={
                              api.ssl_status === "Valid"
                                ? "status online"
                                : api.ssl_status === "Expiring Soon"
                                ? "status warning"
                                : "status offline"
                            }
                          >
                            ● {api.ssl_status}
                          </span>
                        </td>

                        <td>
                          {api.expiry}
                          {api.days_remaining > 0 && (
                            <small style={{ display: "block", color: "#888" }}>
                              ({api.days_remaining} days left)
                            </small>
                          )}
                        </td>

                        <td>
                          {api.vulnerabilities === 0 ? (
                            <span className="safe">✓ Header Security Optimal</span>
                          ) : (
                            <div>
                              <span className="danger-text">⚠ {api.vulnerabilities} Issue(s)</span>
                              {api.header_issues && api.header_issues.length > 0 && (
                                <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px", fontSize: "12px", color: "#e57373" }}>
                                  {api.header_issues.map((issue, idx) => (
                                    <li key={idx}>{issue}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="score-wrapper">
                            <div className="score-bar">
                              <div
                                className="score-fill"
                                style={{
                                  width: `${api.score}%`,
                                  backgroundColor:
                                    api.score >= 80 ? "#4caf50" : api.score >= 50 ? "#ff9800" : "#f44336",
                                }}
                              ></div>
                            </div>
                            <strong>{api.score}/100</strong>
                          </div>
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

export default Security;