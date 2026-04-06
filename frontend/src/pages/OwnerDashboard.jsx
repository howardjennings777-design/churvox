import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "";

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/owner/stats`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load owner dashboard");
        }

        const data = await res.json();

        if (mounted) {
          setStats(data.stats || null);
          setRecentUsers(data.recent_users || []);
        }
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load owner dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const cardStyle = {
    background: "#0f172a",
    color: "#fff",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid rgba(255,255,255,0.08)"
  };

  const statBox = {
    background: "#111827",
    color: "#fff",
    borderRadius: "16px",
    padding: "16px",
    minHeight: "96px",
    border: "1px solid rgba(255,255,255,0.08)"
  };

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Owner Platform</h1>
        <div style={cardStyle}>Loading owner dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Owner Platform</h1>
        <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.5)" }}>
          {String(error).includes("403")
            ? "This account is not marked as platform owner yet."
            : error}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Owner Platform</h1>
        <Link to="/dashboard" style={{ textDecoration: "none", padding: "10px 14px", borderRadius: 12, background: "#2563eb", color: "#fff" }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        <div style={statBox}>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Total Users</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats?.total_users ?? 0}</div>
        </div>
        <div style={statBox}>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Businesses</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats?.total_businesses ?? 0}</div>
        </div>
        <div style={statBox}>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Jobs</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats?.total_jobs ?? 0}</div>
        </div>
        <div style={statBox}>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Clients</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats?.total_clients ?? 0}</div>
        </div>
        <div style={statBox}>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Invoices</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats?.total_invoices ?? 0}</div>
        </div>
        <div style={statBox}>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Active Timers</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats?.active_timers ?? 0}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Recent Users</h2>
        {recentUsers.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No recent users found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {recentUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)"
                }}
              >
                <div style={{ fontWeight: 700 }}>{u.full_name || u.email || "User"}</div>
                <div style={{ opacity: 0.8, fontSize: 14 }}>{u.email || "No email"}</div>
                <div style={{ opacity: 0.8, fontSize: 14 }}>
                  {(u.business_name || "No business")} • {(u.role || "user")} • {(u.plan || "solo")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
