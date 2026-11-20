"use client";

import Image from "next/image";
import { useState } from "react";

export interface SidebarNavItem {
  label: string;
  icon: "grid" | "users" | "shield" | "settings" | "operations" | "cooperatives" | "cocoa" | "marketplace" | "finance" | "intelligence" | "system";
}

interface AdminSidebarProps {
  fullName: string;
  username: string;
  activeItem: string;
  items: SidebarNavItem[];
  onNavigate: (label: string) => void;
}

const iconPaths: Record<SidebarNavItem["icon"], string> = {
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-13v3m0 13v3M2 12h3m14 0h3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12m0-14.14-2.12 2.12m-9.9 9.9-2.12 2.12",
  operations: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h8M8 12h8M8 16h5",
  cooperatives: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6M8 11h1m6 0h1M8 15h1m6 0h1",
  cocoa: "M12 22V8m0 5c-4 0-7-2-8-6 4-1 7 1 8 6Zm0-3c4 0 7-2 8-6-4-1-7 1-8 6Zm0 3c-3 3-6 3-9 1 2-3 5-4 9-1Zm0 0c3 3 6 3 9 1-2-3-5-4-9-1Z",
  marketplace: "M3 9l2-5h14l2 5M5 9v12h14V9M9 21v-6h6v6M3 9c0 2 1.5 3 3.5 3S10 11 10 9m4 0c0 2 1.5 3 3.5 3S21 11 21 9",
  finance: "M3 21h18M5 18V9m4 9V5m4 13v-6m4 6V8M3 6l5-3 4 4 5-4 4 3",
  intelligence: "M4 19V5m0 14h16M7 16l3-4 3 2 4-6 3 2",
  system: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-13v3m0 13v3M2 12h3m14 0h3",
};

export function AdminSidebar({
  fullName,
  username,
  activeItem,
  items,
  onNavigate,
}: AdminSidebarProps) {
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [cooperativesOpen, setCooperativesOpen] = useState(true);
  const [cocoaOpen, setCocoaOpen] = useState(true);
  const [marketplaceOpen, setMarketplaceOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);
  const [intelligenceOpen, setIntelligenceOpen] = useState(true);
  const [systemOpen, setSystemOpen] = useState(true);

  const operations = ["Farmers", "Farms & GIS", "Field Operations", "Verification"];
  const cooperatives = ["Cooperatives", "Agents"];
  const cocoa = ["Production", "Purchases", "Quality", "Batches & Traceability", "Inventory"];
  const marketplace = ["Listings", "Buyers", "Orders", "Payments"];
  const finance = ["Loans"];
  const intelligence = ["Analytics", "GIS Intelligence", "Reports"];
  const system = ["Users & Access", "Notifications", "Documents", "Audit & Compliance", "Settings", "Support"];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__logo">
          <Image src="/logo/logo.png" alt="GOCOFA" width={40} height={40} priority />
        </div>
        <small>Administration</small>
      </div>

      <div className="admin-sidebar__divider" aria-hidden="true" />

      <nav className="admin-nav" aria-label="Main navigation">
        {items.map((item) => {
          const row = (
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
          );

          if (item.label === "Overview") {
            return (
              <div key={item.label}>
                {row}
                <div className="admin-sidebar__operations">
                  <button
                    type="button"
                    className="admin-nav__item"
                    onClick={() => setOperationsOpen((prev) => !prev)}
                  >
                    <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={iconPaths.operations} />
                    </svg>
                    <span>Operations</span>
                    <span className={`admin-nav__arrow ${operationsOpen ? "open" : ""}`} aria-hidden="true" />
                  </button>

                  {operationsOpen && (
                    <div className="admin-nav__dropdown">
                      {operations.map((operation) => (
                        <button
                          key={operation}
                          type="button"
                          className={activeItem === operation ? "admin-nav__dropdown-item active" : "admin-nav__dropdown-item"}
                          aria-current={activeItem === operation ? "page" : undefined}
                          onClick={() => onNavigate(operation)}
                        >
                          {operation}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-sidebar__operations admin-sidebar__cooperatives">
                  <button
                    type="button"
                    className="admin-nav__item"
                    onClick={() => setCooperativesOpen((prev) => !prev)}
                  >
                    <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={iconPaths.cooperatives} />
                    </svg>
                    <span>Cooperatives</span>
                    <span className={`admin-nav__arrow ${cooperativesOpen ? "open" : ""}`} aria-hidden="true" />
                  </button>

                  {cooperativesOpen && (
                    <div className="admin-nav__dropdown">
                      {cooperatives.map((cooperative) => (
                        <button
                          key={cooperative}
                          type="button"
                          className={activeItem === cooperative ? "admin-nav__dropdown-item active" : "admin-nav__dropdown-item"}
                          aria-current={activeItem === cooperative ? "page" : undefined}
                          onClick={() => onNavigate(cooperative)}
                        >
                          {cooperative}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-sidebar__operations admin-sidebar__cocoa">
                  <button
                    type="button"
                    className="admin-nav__item"
                    onClick={() => setCocoaOpen((prev) => !prev)}
                  >
                    <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={iconPaths.cocoa} />
                    </svg>
                    <span>COCOA</span>
                    <span className={`admin-nav__arrow ${cocoaOpen ? "open" : ""}`} aria-hidden="true" />
                  </button>

                  {cocoaOpen && (
                    <div className="admin-nav__dropdown">
                      {cocoa.map((module) => (
                        <button
                          key={module}
                          type="button"
                          className={activeItem === module ? "admin-nav__dropdown-item active" : "admin-nav__dropdown-item"}
                          aria-current={activeItem === module ? "page" : undefined}
                          onClick={() => onNavigate(module)}
                        >
                          {module}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-sidebar__operations admin-sidebar__marketplace">
                  <button
                    type="button"
                    className="admin-nav__item"
                    onClick={() => setMarketplaceOpen((prev) => !prev)}
                  >
                    <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={iconPaths.marketplace} />
                    </svg>
                    <span>MARKETPLACE</span>
                    <span className={`admin-nav__arrow ${marketplaceOpen ? "open" : ""}`} aria-hidden="true" />
                  </button>

                  {marketplaceOpen && (
                    <div className="admin-nav__dropdown">
                      {marketplace.map((module) => (
                        <button
                          key={module}
                          type="button"
                          className={activeItem === module ? "admin-nav__dropdown-item active" : "admin-nav__dropdown-item"}
                          aria-current={activeItem === module ? "page" : undefined}
                          onClick={() => onNavigate(module)}
                        >
                          {module}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-sidebar__operations admin-sidebar__finance">
                  <button
                    type="button"
                    className="admin-nav__item"
                    onClick={() => setFinanceOpen((prev) => !prev)}
                  >
                    <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={iconPaths.finance} />
                    </svg>
                    <span>FINANCE</span>
                    <span className={`admin-nav__arrow ${financeOpen ? "open" : ""}`} aria-hidden="true" />
                  </button>

                  {financeOpen && (
                    <div className="admin-nav__dropdown">
                      {finance.map((module) => (
                        <button
                          key={module}
                          type="button"
                          className={activeItem === module ? "admin-nav__dropdown-item active" : "admin-nav__dropdown-item"}
                          aria-current={activeItem === module ? "page" : undefined}
                          onClick={() => onNavigate(module)}
                        >
                          {module}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-sidebar__operations admin-sidebar__intelligence">
                  <button
                    type="button"
                    className="admin-nav__item"
                    onClick={() => setIntelligenceOpen((prev) => !prev)}
                  >
                    <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={iconPaths.intelligence} />
                    </svg>
                    <span>INTELLIGENCE</span>
                    <span className={`admin-nav__arrow ${intelligenceOpen ? "open" : ""}`} aria-hidden="true" />
                  </button>

                  {intelligenceOpen && (
                    <div className="admin-nav__dropdown">
                      {intelligence.map((module) => (
                        <button
                          key={module}
                          type="button"
                          className={activeItem === module ? "admin-nav__dropdown-item active" : "admin-nav__dropdown-item"}
                          aria-current={activeItem === module ? "page" : undefined}
                          onClick={() => onNavigate(module)}
                        >
                          {module}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="admin-sidebar__operations admin-sidebar__system">
                  <button
                    type="button"
                    className="admin-nav__item"
                    onClick={() => setSystemOpen((prev) => !prev)}
                  >
                    <svg className="admin-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d={iconPaths.system} />
                    </svg>
                    <span>SYSTEM</span>
                    <span className={`admin-nav__arrow ${systemOpen ? "open" : ""}`} aria-hidden="true" />
                  </button>

                  {systemOpen && (
                    <div className="admin-nav__dropdown">
                      {system.map((module) => (
                        <button
                          key={module}
                          type="button"
                          className={activeItem === module ? "admin-nav__dropdown-item active" : "admin-nav__dropdown-item"}
                          aria-current={activeItem === module ? "page" : undefined}
                          onClick={() => onNavigate(module)}
                        >
                          {module}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return <div key={item.label}>{row}</div>;
        })}
      </nav>

      <div className="admin-sidebar__bottom">
        <div className="admin-profile">
          <span className="admin-avatar">{fullName.charAt(0).toUpperCase()}</span>
          <span className="admin-profile__copy">
            <strong>{fullName}</strong>
            <small>@{username}</small>
          </span>
        </div>
      </div>
    </aside>
  );
}
