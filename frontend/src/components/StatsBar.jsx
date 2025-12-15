// src/components/StatsBar.jsx
import { useEffect, useState, useCallback } from "react";
import { fetchStats } from "../utils";

function StatSkeleton() {
  return (
    <div className="stats-card">
      <div className="stats-label">Loading</div>
      <div className="stats-value skeleton">•••</div>
    </div>
  );
}

export default function StatsBar({ token, autoRefresh }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchStats(token);
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load stats bar", err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    if (!autoRefresh || !token) return;
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [token, autoRefresh, load]);

  const serverTime = stats?.server_time
    ? new Date(stats.server_time).toLocaleString(navigator.language, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : "-";

  if (loading && !stats) {
    return (
      <div className="stats-bar">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    );
  }

  return (
    <div className="stats-bar">
      <div className="stats-card primary">
        <div className="stats-label">Total logs</div>
        <div className="stats-value">{stats?.total_logs?.toLocaleString() ?? "—"}</div>
      </div>
      <div className="stats-card danger">
        <div className="stats-label">Total alerts</div>
        <div className="stats-value">{stats?.total_alerts?.toLocaleString() ?? "—"}</div>
      </div>
      <div className="stats-card warning">
        <div className="stats-label">Alerts last 24h</div>
        <div className="stats-value">{stats?.alerts_last_24h?.toLocaleString() ?? "—"}</div>
      </div>
      <div className="stats-card subtle">
        <div className="stats-label">Server time</div>
        <div className="stats-value small">{serverTime}</div>
        {lastUpdated && (
          <div className="stats-updated">
            Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}