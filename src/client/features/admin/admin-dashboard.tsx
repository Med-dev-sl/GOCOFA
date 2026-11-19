"use client";

import { useState } from "react";
import { AdminSidebar, SidebarNavItem } from "@/src/client/components/sidebar/admin-sidebar";

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

  return (
    <main className="admin-dashboard">
      <AdminSidebar
        fullName={fullName}
        username={username}
        activeItem={activeItem}
        items={navigation}
        onNavigate={setActiveItem}
        onLogout={onLogout}
      />

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
