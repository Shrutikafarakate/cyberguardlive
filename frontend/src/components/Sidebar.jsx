import { useLocation, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const adminName =
    localStorage.getItem("adminName") || "Administrator";

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  const menuItems = [
    {
      path: "/dashboard",
      icon: "▣",
      label: "Dashboard"
    },
    {
      path: "/api-management",
      icon: "◈",
      label: "API Management"
    },
    {
      path: "/monitoring",
      icon: "◉",
      label: "Monitoring"
    },
    {
      path: "/security",
      icon: "🔒",
      label: "Security"
    },
    {
      path: "/reports",
      icon: "▤",
      label: "Reports"
    },
    {
      path: "/alerts",
      icon: "🔔",
      label: "Alerts"
    }
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-logo">

        <span>🛡️</span>

        <div>
          <h2>CyberGuard</h2>
          <span>LIVE</span>
        </div>

      </div>

      <nav className="sidebar-menu">

        {menuItems.map((item) => (

          <button
            key={item.path}
            className={`menu-item ${
              location.pathname === item.path
                ? "active"
                : ""
            }`}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>

        ))}

      </nav>

      

    </aside>
  );
}

export default Sidebar;