// src/components/AlertsPanel.jsx
import { useEffect, useState, useCallback } from "react";
import { getAlerts } from "../services/api";
import { formatDateTime } from "../utils";

const MITRE_MAP = {
  "Brute Force": { id: "T1110", technique: "Brute Force", tactic: "Credential Access" },
  "Port Scan": { id: "T1046", technique: "Network Service Scanning", tactic: "Discovery" },
};

function getMitre(alert) {
  return MITRE_MAP[alert.type] || null;
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AlertsPanel({ token, onLookup, refreshTick }) {
  const [alerts, setAlerts] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [ipFilter, setIpFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const debouncedIp = useDebounce(ipFilter, 300);
  const debouncedSource = useDebounce(sourceFilter, 300);

  const [loading, setLoading] = useState(false);

  const [resolvedIds, setResolvedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("resolvedAlerts") || "[]"));
    } catch {
      return new Set();
    }
  });

  const [tagsById, setTagsById] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("alertTags") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) return;
      setLoading(true);
      try {
        const data = await getAlerts(token, {
          limit,
          page,
          ip: debouncedIp || undefined,
          source: debouncedSource || undefined,
          type: typeFilter || undefined,
          severity: severityFilter || undefined,
        });
        if (!cancelled) setAlerts(data);
      } catch (err) {
        console.error("load alerts failed", err);
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token, page, limit, debouncedIp, debouncedSource, typeFilter, severityFilter, refreshTick]);

  const reset = useCallback(() => {
    setIpFilter("");
    setSourceFilter("");
    setTypeFilter("");
    setSeverityFilter("");
    setPage(1);
  }, []);

  const toggleResolved = useCallback((id) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem("resolvedAlerts", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const addTag = useCallback((id) => {
    const input = prompt("Add tag (comma separated, will append):");
    if (!input) return;
    const newTags = input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setTagsById((prev) => {
      const existing = prev[id] || [];
      const merged = Array.from(new Set([...existing, ...newTags]));
      const next = { ...prev, [id]: merged };
      localStorage.setItem("alertTags", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h2>Alerts</h2>
          <p className="panel-subtitle">Triggered detection rules</p>
        </div>
      </div>

      <div className="filters-row">
        <input
          placeholder="Filter by IP"
          value={ipFilter}
          onChange={(e) => {
            setPage(1);
            setIpFilter(e.target.value);
          }}
        />
        <input
          placeholder="Source (e.g. home-lab)"
          value={sourceFilter}
          onChange={(e) => {
            setPage(1);
            setSourceFilter(e.target.value);
          }}
        />
        <select
          value={severityFilter}
          onChange={(e) => {
            setPage(1);
            setSeverityFilter(e.target.value);
          }}
        >
          <option value="">All severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value);
          }}
        >
          <option value="">All types</option>
          <option value="Brute Force">Brute Force</option>
          <option value="Port Scan">Port Scan</option>
        </select>
        <button className="btn secondary" onClick={reset}>
          Reset
        </button>
      </div>

      {loading ? (
        <div className="loading-placeholder">Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <p>No alerts found.</p>
        </div>
      ) : (
        <div className="list">
          {alerts.map((alert) => {
            const mitre = getMitre(alert);
            const resolved = resolvedIds.has(alert._id);
            const tags = tagsById[alert._id] || [];
            return (
              <div
                key={alert._id}
                className={`list-row ${resolved ? "alert-resolved" : ""}`}
              >
                <div className="alert-header">
                  <div className="alert-meta">
                    <time dateTime={alert.timestamp}>{formatDateTime(alert.timestamp)}</time>
                    {alert.severity && (
                      <span className={`severity-badge severity-${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                    )}
                    {mitre && (
                      <span className="mitre-badge">
                        <span className="mitre-id">{mitre.id}</span>
                        <span className="mitre-tactic">{mitre.tactic}</span>
                      </span>
                    )}
                  </div>
                  <div className="alert-actions">
                    <button
                      className={`btn-icon ${resolved ? 'btn-resolved' : ''}`}
                      onClick={() => toggleResolved(alert._id)}
                      aria-label={resolved ? "Mark active" : "Mark resolved"}
                    >
                      {resolved ? "✓" : "○"}
                    </button>
                  </div>
                </div>

                <div className="alert-content">
                  <div className="alert-type">{alert.type}</div>
                  <div className="alert-desc">{alert.description}</div>
                  <div className="alert-sources">
                    {alert.source && <span className="pill pill-source">{alert.source}</span>}
                    {alert.ip && (
                      <button
                        type="button"
                        className="pill pill-ip"
                        onClick={() => onLookup && onLookup(alert.ip)}
                      >
                        {alert.ip}
                      </button>
                    )}
                  </div>
                </div>

                {(tags.length > 0 || !resolved) && (
                  <div className="alert-footer">
                    {tags.length > 0 && (
                      <div className="tag-list">
                        {tags.map((t) => (
                          <span key={t} className="tag-pill">{t}</span>
                        ))}
                      </div>
                    )}
                    {!resolved && (
                      <button className="btn-tag" onClick={() => addTag(alert._id)}>
                        + Tag
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="pager">
          <button
            className="btn secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>Page {page}</span>
          <button
            className="btn secondary"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}