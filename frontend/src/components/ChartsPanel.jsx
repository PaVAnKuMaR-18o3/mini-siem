import { useState, useEffect } from "react";
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from "recharts";

// Professional Color Palette
const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']; // Red, Orange, Blue, Green
const BG_TOOLTIP = '#1e293b';
const BORDER_TOOLTIP = '#334155';

// API functions assumed to be in api.js
import { getAlertsOverTime, getSeverityDistribution, getTopSourceIps } from "../services/api";

// Custom Tooltip Component for that "Cyber" feel
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: BG_TOOLTIP,
        border: `1px solid ${BORDER_TOOLTIP}`,
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>{label}</p>
        <p style={{ color: '#f8fafc', fontWeight: 'bold', margin: '4px 0 0' }}>
          {payload[0].value} Events
        </p>
      </div>
    );
  }
  return null;
};

export default function ChartsPanel({ token }) {
  const [data, setData] = useState({ alerts: [], severity: [], ips: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [alerts, severity, ips] = await Promise.all([
          getAlertsOverTime(token),
          getSeverityDistribution(token),
          getTopSourceIps(token)
        ]);
        
        // Safety checks for data format
        setData({
          alerts: Array.isArray(alerts) ? alerts : [],
          severity: Array.isArray(severity) ? severity.map(s => ({
            name: s.name || s._id, value: s.value
          })) : [],
          ips: Array.isArray(ips) ? ips : []
        });
      } catch (e) {
        console.error("Chart load error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) return <div className="charts-grid skeleton-loader">Loading Analytics...</div>;

  return (
    <div className="charts-grid">
      
      {/* 1. ALERTS TREND */}
      <div className="chart-card">
        <h3>Alert Volume (24h)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.alerts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
            <XAxis dataKey="hour" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
            <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2. SEVERITY BREAKDOWN */}
      <div className="chart-card">
        <h3>Threat Severity</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data.severity}
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.severity.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{fontSize: '11px', color: '#94a3b8'}}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 3. TOP ATTACKERS */}
      <div className="chart-card">
        <h3>Top Source IPs</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.ips} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="ip" 
              type="category" 
              width={100} 
              tick={{fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono'}} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}