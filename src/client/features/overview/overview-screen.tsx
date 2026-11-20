"use client";

import { useEffect, useState } from "react";

interface OverviewData {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    loggedInToday: number;
  };
  recentUsers: Array<{
    fullName: string;
    username: string;
    role: string;
    createdAt: string;
    lastLoginAt: string | null;
  }>;
}

export function OverviewScreen({ fullName }: { fullName: string }) {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/overview")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Overview unavailable");
        return data;
      })
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : "Overview unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="overview-loading">
        <span className="material-symbols-outlined overview-loading__icon">progress_activity</span>
        <p>Loading live overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="module-placeholder">
        <p>Overview unavailable</p>
        <h2>{error}</h2>
      </div>
    );
  }

  const kpis = [
    { label: "Total users", value: (overview?.kpis.totalUsers ?? 0).toLocaleString(), icon: "groups", tone: "green" },
    { label: "Active users", value: (overview?.kpis.activeUsers ?? 0).toLocaleString(), icon: "verified_user", tone: "lime" },
    { label: "Logged in today", value: (overview?.kpis.loggedInToday ?? 0).toLocaleString(), icon: "login", tone: "mint" },
  ];

  return (
    <div className="overview-screen">
      <div className="overview-heading">
        <div>
          <p>Dashboard overview</p>
          <h2>Welcome back, {fullName}</h2>
        </div>
      </div>

      <div className="overview-kpis">
        {kpis.map((item, index) => (
          <article key={item.label} className={`overview-kpi overview-kpi--${item.tone}`} style={{ "--kpi-index": index } as React.CSSProperties}>
            <div className="overview-kpi__top">
              <span className="overview-kpi__icon material-symbols-outlined">{item.icon}</span>
            </div>
            <strong>{item.value}</strong>
            <span className="overview-kpi__label">{item.label}</span>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <article className="overview-panel overview-panel--wide">
          <div className="overview-panel__header">
            <div>
              <p>Account directory</p>
              <h3>Recent users</h3>
            </div>
          </div>
          <div className="overview-recent-users">
            {overview?.recentUsers.length ? overview.recentUsers.map((user) => (
              <div className="overview-user-row" key={user.username}>
                <span className="overview-user-row__avatar">{user.fullName.charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{user.fullName}</strong>
                  <small>@{user.username} · {user.role}</small>
                </div>
                <span>{user.lastLoginAt ? "Active" : "Never logged in"}</span>
              </div>
            )) : (
              <div className="overview-empty">No users found.</div>
            )}
          </div>
        </article>

        <article className="overview-panel overview-panel--distribution">
          <div className="overview-panel__header">
            <div>
              <p>User status</p>
              <h3>Account status</h3>
            </div>
          </div>
          <div className="overview-status-list">
            <div><span>Active</span><strong>{overview?.kpis.activeUsers ?? 0}</strong></div>
            <div><span>Inactive</span><strong>{Math.max((overview?.kpis.totalUsers ?? 0) - (overview?.kpis.activeUsers ?? 0), 0)}</strong></div>
            <div><span>Logged in today</span><strong>{overview?.kpis.loggedInToday ?? 0}</strong></div>
          </div>
        </article>
      </div>
    </div>
  );
}
