"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "@/src/client/components/loading/logo-loader";
import { LoginScreen } from "@/src/client/features/auth/login-screen";

export function DashboardShell() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <main className="dashboard-loader-screen">
        <LogoLoader />
      </main>
    );
  }

  return <LoginScreen />;
}
