// src/services/api.js

export const API_BASE = "http://127.0.0.1:8000";
const TOKEN_KEY = "access_token";

async function apiRequest(path, { method = "GET", token, body, params } = {}) {
  const url = new URL(API_BASE + path);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, v);
      }
    });
  }

  const actualToken = token || localStorage.getItem(TOKEN_KEY);

  const headers = {};
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  if (actualToken) {
    headers["Authorization"] = `Bearer ${actualToken}`;
  }

  const fetchOptions = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    if (res.status === 401) {
        console.warn("Token expired or invalid. Clearing storage.");
        localStorage.removeItem(TOKEN_KEY);
    }

    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

// --- Auth Functions ---

export async function login(username, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  
  if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
  }
  
  return data.access_token;
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
}

// --- Data Functions ---

export async function getLogs(token, { limit = 20, page = 1, ip, source, contains } = {}) {
  return apiRequest("/logs", {
    token, 
    params: { limit, page, ip, source, contains },
  });
}

export async function getAlerts(token, { limit = 20, page = 1, ip, source, type, severity } = {}) {
  return apiRequest("/alerts", {
    token,
    params: { limit, page, ip, source, type, severity },
  });
}

export async function getStats(token) {
  return apiRequest("/stats", { token });
}

export async function lookupIP(ip, token) {
  return apiRequest("/threat/ip", {
    token,
    params: { ip },
  });
}

// --- NEW CHART FUNCTIONS (These were missing!) ---

export async function getAlertsOverTime(token) {
  return apiRequest("/stats/alerts-over-time", { token });
}

export async function getSeverityDistribution(token) {
  return apiRequest("/stats/severity-distribution", { token });
}

export async function getTopSourceIps(token) {
  return apiRequest("/stats/top-source-ips", { token });
}