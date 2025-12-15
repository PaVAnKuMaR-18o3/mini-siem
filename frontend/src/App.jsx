// src/App.jsx
import { useEffect, useState } from "react";
import "./App.css";

// Components
import Login from "./pages/Login";
import LogsPanel from "./components/LogsPanel";
import AlertsPanel from "./components/AlertsPanel";
import StatsBar from "./components/StatsBar";
import ChartsPanel from "./components/ChartsPanel";
import AgentPanel from "./components/AgentPanel";
import LiveStreamPanel from "./components/LiveStreamPanel";
import IpDetails from "./components/IpDetails";

// API
import { lookupIP } from "./services/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("jwt") || "");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [ipInfo, setIpInfo] = useState(null);

  // Auto-refresh logic (used by AlertsPanel, LogsPanel, ChartsPanel)
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setRefreshTick((t) => t + 1), 8000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  // Save token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("jwt", token);
    } else {
      localStorage.removeItem("jwt");
    }
  }, [token]);

  const logout = () => setToken("");
  
  const handleLookup = async (ip) => {
    try {
      const data = await lookupIP(ip, token);
      setIpInfo(data);
    } catch {
      console.error("IP lookup failed");
    }
  };

  // Show login if no token
  if (!token) {
    return <Login onLogin={setToken} />;
  }

  return (
    <div className="app-root">
      
      {/* 1. TOP HEADER */}
      <header className="top-bar">
        <div className="brand-section">
          <div className="logo-icon">🛡️</div>
          <div>
            <h1 className="app-title">Mini-SIEM</h1>
            <p className="app-subtitle">Security Operations Center</p>
          </div>
        </div>

        <div className="controls-area">
          <div className={`indicator ${autoRefresh ? 'on' : ''}`}></div>
          <button 
            className={`control-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "LIVE UPDATES" : "PAUSED"}
          </button>
          
          <button className="control-btn btn-logout" onClick={logout}>
            LOGOUT
          </button>
        </div>
      </header>

      {/* 2. STATS BAR — now uses autoRefresh for its own polling */}
      <StatsBar token={token} autoRefresh={autoRefresh} />

      {/* 3. CHARTS ROW */}
      <ChartsPanel token={token} />

      {/* 4. MAIN DASHBOARD GRID */}
      <main className="dashboard-grid">
        
        {/* LEFT COLUMN */}
        <section className="left-col">
          <AgentPanel token={token} />
        </section>

        {/* RIGHT COLUMN */}
        <section className="right-col">
          <LiveStreamPanel token={token} />
          <AlertsPanel token={token} refreshTick={refreshTick} onLookup={handleLookup} />
          <LogsPanel token={token} refreshTick={refreshTick} onLookup={handleLookup} />
        </section>

      </main>

      {/* IP LOOKUP MODAL */}
      {ipInfo && <IpDetails data={ipInfo} onClose={() => setIpInfo(null)} />}
    </div>
  );
}

export default App;