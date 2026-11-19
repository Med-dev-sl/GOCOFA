"use client";

import Image from "next/image";

export interface SidebarNavItem {
  label: string;
  icon: "grid" | "users" | "shield" | "settings";
}

interface AdminSidebarProps {
  fullName: string;
  username: string;
  activeItem: string;
  items: SidebarNavItem[];
  onNavigate: (label: string) => void;
  onLogout: () => void;
}

const iconPaths: Record<SidebarNavItem["icon"], string> = {
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-13v3m0 13v3M2 12h3m14 0h3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12m0-14.14-2.12 2.12m-9.9 9.9-2.12 2.12",
};

export function AdminSidebar({
  fullName,
  username,
  activeItem,
  items,
  onNavigate,
  onLogout,
}: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__logo">
          <Image src="/logo/logo.png" alt="GOCOFA" fill sizes="72px" />
        </div>
        <small>Administration</small>
      </div>

      <div className="admin-sidebar__divider" aria-hidden="true" />

      <nav className="admin-nav" aria-label="Main navigation">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={activeItem === item.label ? "admin-nav__item active" : "admin-nav__item"}
            onClick={() => onNavigate(item.label)}
            aria-current={activeItem === item.label ? "page" : undefined}
          >
            <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d={iconPaths[item.icon]} />
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button type="button" className="admin-profile" onClick={onLogout} aria-label="Sign out">
        <span className="admin-avatar">{fullName.charAt(0).toUpperCase()}</span>
        <span className="admin-profile__copy">
          <strong>{fullName}</strong>
          <small>@{username}</small>
        </span>
        <span className="admin-profile__logout" aria-hidden="true">↗</span>
      </button>
    </aside>
  );
}
