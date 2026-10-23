function StatCard({ icon, title, value, change, type }) {
  return (
    <div className="stat-card">

      <div className={`stat-icon ${type}`}>
        {icon}
      </div>

      <div className="stat-content">

        <p>{title}</p>

        <h2>{value}</h2>

        <span className="stat-change">
          {change}
        </span>

      </div>

    </div>
  );
}

export default StatCard;