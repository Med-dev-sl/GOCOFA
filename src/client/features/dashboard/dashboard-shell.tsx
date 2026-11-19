"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "@/src/client/components/loading/logo-loader";
import { LoginScreen } from "@/src/client/features/auth/login-screen";
import { AdminDashboard } from "@/src/client/features/admin/admin-dashboard";

interface AuthUser {
  fullName: string;
  username: string;
  email: string;
  role: string;
}

export function DashboardShell() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 2200);

    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.authenticated) {
          setUser({
            fullName: data.session.username,
            username: data.session.username,
            email: "",
            role: data.session.role,
          });
        }
      })
      .catch(() => undefined);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  if (isLoading) {
    return (
      <main className="dashboard-loader-screen">
        <LogoLoader />
      </main>
    );
  }

  if (user) {
    return (
      <AdminDashboard
        fullName={user.fullName}
        username={user.username}
        role={user.role}
        onLogout={handleLogout}
      />
    );
  }

  return <LoginScreen onAuthenticated={setUser} />;
}
