// src/components/LiveStreamPanel.jsx
import { useEffect, useState } from "react";
import { getLogs } from "../services/api";
import { formatDateTime } from "../utils";

export default function LiveStreamPanel({ token }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getLogs(token, { limit: 10, page: 1 });
        if (!cancelled) setEvents(data);
      } catch (err) {
        console.error("Failed to load live stream", err);
      }
    }

    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h2>Live stream</h2>
          <p className="panel-subtitle">Recent events (polled every 5s)</p>
        </div>
      </div>
      <div className="live-stream-list">
        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No recent events.</p>
          </div>
        ) : (
          <div className="list">
            {events.map((e) => (
              <div key={e._id} className="list-row">
                <div className="log-meta">
                  <time>{formatDateTime(e.timestamp)}</time>
                  {e.source && <span className="pill pill-source">{e.source}</span>}
                </div>
                <div className="log-message">{e.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}