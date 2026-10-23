import { useNavigate } from "react-router-dom";

function Topbar({ title, showProfileDetails = false }) {

  const navigate = useNavigate();

  const adminName =
    localStorage.getItem("adminName") || "Administrator";

  const firstLetter =
    adminName.charAt(0).toUpperCase();


  return (
    <header
      className="topbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "15px 25px",
        boxSizing: "border-box",
      }}
    >

      {/* LEFT SIDE */}
      <div
        className="topbar-left"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >

        <div className="topbar-title-icon">
          
        </div>

        <div className="topbar-heading">

          <h1>{title}</h1>

          <p>
            Real-time API security monitoring
          </p>

        </div>

      </div>


      {/* RIGHT SIDE */}
      <div
        className="topbar-right"
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >

        {/* SYSTEM ONLINE */}
        <div
          className="system-status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >

          <span className="status-dot"></span>

          <span></span>

        </div>


        {/* NOTIFICATION */}
        <button
            className="notification-btn"
            type="button"
            onClick={() => navigate("/alerts")}
            style={{
              position: "relative",
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >

          🔔

          <span
            className="notification-badge"
            style={{
              position: "absolute",
              top: "-3px",
              right: "-5px",
              color: "white",
              borderRadius: "50%",
              fontSize: "10px",
              width: "17px",
              height: "17px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
          </span>

        </button>


        {/* PROFILE */}
        {/* PROFILE */}
<button
  className="topbar-profile"
  type="button"
  onClick={() => navigate("/profile")}
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "5px",
  }}
>

  {/* PROFILE CIRCLE */}
    <div
      className="profile-circle"
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: "#2563eb",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        flexShrink: 0,
      }}
    >
      {firstLetter}
    </div>


    {/* NAME + ROLE + ARROW
        Only show when enabled */}
    {showProfileDetails && (
      <>
        <div
          className="profile-info"
          style={{
            display: "flex",
            flexDirection: "column",
            textAlign: "left",
          }}
        >

          <strong>
            {adminName}
          </strong>

          <span>
            Administrator
          </span>

        </div>


        <span className="profile-arrow">
          ▾
        </span>
      </>
    )}

  </button>

      </div>

    </header>
  );
}

export default Topbar;