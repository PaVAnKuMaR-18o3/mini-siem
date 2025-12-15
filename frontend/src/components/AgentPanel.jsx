// src/components/AgentPanel.jsx
import { useState } from "react";

const INITIAL_AGENTS = [
  {
    id: "home-lab-1",
    name: "home-lab",
    ip: "192.168.1.10",
    status: "online",
    lastSeen: "just now",
  },
  {
    id: "local-test-1",
    name: "local-test",
    ip: "127.0.0.1",
    status: "online",
    lastSeen: "2 min ago",
  },
];

export default function AgentPanel() {
  const [agents] = useState(INITIAL_AGENTS);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h2>Agents</h2>
          <p className="panel-subtitle">Connected log senders (UI mock)</p>
        </div>
      </div>
      <table className="agent-table">
        <thead>
          <tr>
            <th>Host</th>
            <th>IP</th>
            <th>Status</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td className="mono">{a.ip}</td>
              <td>
                <span className={`agent-status agent-${a.status}`}>
                  {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                </span>
              </td>
              <td>{a.lastSeen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}