// src/components/Analytics.jsx
// Simple summary panel (frontend-only analytics; can be expanded later)
export default function Analytics() {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2>Analytics</h2>
      </div>
      <p className="panel-subtitle">
        High-level insights based on your current detection rules. This panel is
        mostly visual; deeper analytics can be wired later to new API
        endpoints.
      </p>
      <ul className="analytics-list">
        <li>Brute force SSH attempts in the last 24h.</li>
        <li>Top talking IPs from your home-lab environment.</li>
        <li>Ratio of alerts to total logs over time.</li>
      </ul>
    </div>
  );
}
