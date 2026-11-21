"use client";

import { useState } from "react";
import { AdminSidebar, SidebarNavItem } from "@/src/client/components/sidebar/admin-sidebar";
import { StatusModal } from "@/src/client/components/modal/status-modal";
import { OverviewScreen } from "@/src/client/features/overview/overview-screen";
import { FarmersScreen } from "@/src/client/features/farmers/farmers-screen";
import { FarmsGISScreen } from "@/src/client/features/farms/farms-gis-screen";
import { FieldOperationsScreen } from "@/src/client/features/field-operations/field-operations-screen";

interface AdminDashboardProps {
  fullName: string;
  username: string;
  role: string;
  onLogout: () => void;
}

const navigation: SidebarNavItem[] = [
  { label: "Overview", icon: "grid" },
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

        {activeItem === "Overview" ? (
          <OverviewScreen fullName={fullName} />
        ) : activeItem === "Farmers" ? (
          <FarmersScreen />
        ) : activeItem === "Farms & GIS" ? (
          <FarmsGISScreen />
        ) : activeItem === "Field Operations" ? (
          <FieldOperationsScreen />
        ) : (
          <div className="module-placeholder">
            <p>GOCOFA module</p>
            <h2>{activeItem}</h2>
            <span>This workspace is ready for implementation.</span>
          </div>
        )}
      </section>
    </main>
  );
}
