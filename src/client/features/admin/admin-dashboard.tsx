"use client";

import { useState } from "react";
import { AdminSidebar, SidebarNavItem } from "@/src/client/components/sidebar/admin-sidebar";
import { StatusModal } from "@/src/client/components/modal/status-modal";

interface AdminDashboardProps {
  fullName: string;
  username: string;
  role: string;
  onLogout: () => void;
}

const navigation: SidebarNavItem[] = [
  { label: "Overview", icon: "grid" },
  { label: "Users", icon: "users" },
  { label: "Roles", icon: "shield" },
  { label: "Settings", icon: "settings" },
];

export function AdminDashboard({ fullName, username, role, onLogout }: AdminDashboardProps) {
  const [activeItem, setActiveItem] = useState("Overview");
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  return (
    <main className="admin-dashboard">
      <AdminSidebar
        fullName={fullName}
        username={username}
        activeItem={activeItem}
        items={navigation}
        onNavigate={setActiveItem}
      />

      <StatusModal
        open={logoutModalOpen}
        variant="warning"
        title="Logout of GOCOFA?"
        message="Are you sure you want to end this administration session?"
        actionLabel="Yes, logout"
        cancelLabel="Stay logged in"
        onClose={() => setLogoutModalOpen(false)}
        onAction={onLogout}
      />

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <p>GOCOFA control center</p>
            <h1>{activeItem}</h1>
          </div>
          <div className="admin-header__actions">
            <span className="admin-role">{role}</span>
            <button
              type="button"
              className="admin-header__logout"
              onClick={() => setLogoutModalOpen(true)}
              aria-label="Logout"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
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
