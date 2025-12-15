// src/pages/Stats.jsx
import { useEffect, useState } from "react";
import { getStats } from "../services/api";

export default function Stats({ token }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      try {
        const data = await getStats(token);
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load stats");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return <div className="panel-card">{error}</div>;
  }

  if (!stats) {
    return <div className="panel-card">Loading stats…</div>;
  }

  return (
    <div className="panel-card stats-card-full">
      <h2>System stats</h2>
      <div className="stats-grid">
        <div className="metric-card">
          <div className="metric-label">Total logs</div>
          <div className="metric-value">{stats.total_logs}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total alerts</div>
          <div className="metric-value">{stats.total_alerts}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Alerts last 24h</div>
          <div className="metric-value">{stats.alerts_last_24h}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Server time</div>
          <div className="metric-value small">{stats.server_time}</div>
        </div>
      </div>
    </div>
  );
}
