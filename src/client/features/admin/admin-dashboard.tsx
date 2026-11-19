"use client";

import { useState } from "react";

interface AdminDashboardProps {
  fullName: string;
  username: string;
  role: string;
  onLogout: () => void;
}

const navigation = [
  ["Overview", "grid"],
  ["Users", "users"],
  ["Roles", "shield"],
  ["Settings", "settings"],
];

export function AdminDashboard({ fullName, username, role, onLogout }: AdminDashboardProps) {
  const [activeItem, setActiveItem] = useState("Overview");

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__mark">G</span>
          <div>
            <strong>GOCOFA</strong>
            <small>Administration</small>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Main navigation">
          {navigation.map(([label, icon]) => (
            <button
              key={label}
              type="button"
              className={activeItem === label ? "admin-nav__item active" : "admin-nav__item"}
              onClick={() => setActiveItem(label)}
            >
              <span className="admin-nav__icon" data-icon={icon} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="admin-profile" onClick={onLogout}>
          <span className="admin-avatar">{fullName.charAt(0).toUpperCase()}</span>
          <span className="admin-profile__copy">
            <strong>{fullName}</strong>
            <small>@{username}</small>
          </span>
          <span className="admin-profile__logout" aria-label="Sign out">↗</span>
        </button>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <p>GOCOFA control center</p>
            <h1>{activeItem}</h1>
          </div>
          <span className="admin-role">{role}</span>
        </header>

        <div className="admin-welcome">
          <div>
            <p>Welcome back</p>
            <h2>{fullName}</h2>
            <span>Your GOCOFA administration workspace is ready.</span>
          </div>
          <div className="admin-welcome__status">
            <span />
            System operational
          </div>
        </div>

        <div className="admin-stats">
          <article><span>Users</span><strong>—</strong><small>Account directory</small></article>
          <article><span>Roles</span><strong>1</strong><small>Admin role</small></article>
          <article><span>Database</span><strong>Live</strong><small>Neon PostgreSQL</small></article>
        </div>
      </section>
    </main>
  );
}
