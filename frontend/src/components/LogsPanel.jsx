// src/components/LogsPanel.jsx
import { useEffect, useState, useCallback } from "react";
import { getLogs } from "../services/api";
import { formatDateTime, downloadCSV } from "../utils";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function LogsPanel({ token, onLookup, refreshTick }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [ipFilter, setIpFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [contains, setContains] = useState("");
  const [loading, setLoading] = useState(false);

  const debouncedIp = useDebounce(ipFilter, 300);
  const debouncedSource = useDebounce(sourceFilter, 300);
  const debouncedContains = useDebounce(contains, 300);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) return;
      setLoading(true);
      try {
        const data = await getLogs(token, {
          limit,
          page,
          ip: debouncedIp || undefined,
          source: debouncedSource || undefined,
          contains: debouncedContains || undefined,
        });
        if (!cancelled) setLogs(data);
      } catch (err) {
        console.error("load logs failed", err);
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token, page, limit, debouncedIp, debouncedSource, debouncedContains, refreshTick]);

  const reset = useCallback(() => {
    setIpFilter("");
    setSourceFilter("");
    setContains("");
    setPage(1);
  }, []);

  const exportCSV = useCallback(() => {
    const rows = logs.map((log) => ({
      id: log._id,
      timestamp: log.timestamp,
      source: log.source,
      ip: log.ip || "",
      message: log.message,
    }));
    downloadCSV("logs.csv", rows);
  }, [logs]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h2>Logs</h2>
          <p className="panel-subtitle">Inbound events from agents</p>
        </div>
        <button className="btn secondary" onClick={exportCSV} disabled={!logs.length}>
          Export CSV
        </button>
      </div>

      <div className="filters-row">
        <input
          placeholder="Filter by IP in message"
          value={ipFilter}
          onChange={(e) => {
            setPage(1);
            setIpFilter(e.target.value);
          }}
        />
        <input
          placeholder="Source"
          value={sourceFilter}
          onChange={(e) => {
            setPage(1);
            setSourceFilter(e.target.value);
          }}
        />
        <input
          placeholder="Message contains…"
          value={contains}
          onChange={(e) => {
            setPage(1);
            setContains(e.target.value);
          }}
        />
        <button className="btn secondary" onClick={reset}>
          Reset
        </button>
      </div>

      {loading ? (
        <div className="loading-placeholder">Loading logs…</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <p>No logs match your filters.</p>
          <button className="btn secondary" onClick={reset}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="list">
          {logs.map((log) => (
            <div key={log._id} className="list-row">
              <div className="log-meta">
                <time dateTime={log.timestamp}>{formatDateTime(log.timestamp)}</time>
                {log.source && (
                  <span className="pill pill-source">{log.source}</span>
                )}
                {log.ip && (
                  <button
                    type="button"
                    className="pill pill-ip"
                    onClick={() => onLookup && onLookup(log.ip)}
                  >
                    {log.ip}
                  </button>
                )}
              </div>
              <div className="log-message">{log.message}</div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
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