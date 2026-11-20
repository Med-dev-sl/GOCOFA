"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

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
    const controller = new AbortController();

    async function loadOverview() {
      try {
        const response = await fetch("/api/overview", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Overview unavailable");
        setOverview(data);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Overview unavailable");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOverview();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <Activity className="h-5 w-5 animate-pulse text-emerald-700" />
          Loading overview
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        <p className="text-sm font-semibold">Overview unavailable</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const cards = [
    {
      label: "Total users",
      value: (overview?.kpis.totalUsers ?? 0).toLocaleString(),
      icon: Users,
      iconClass: "bg-emerald-50 text-emerald-700",
      detail: "Registered accounts",
    },
    {
      label: "Active users",
      value: (overview?.kpis.activeUsers ?? 0).toLocaleString(),
      icon: UserCheck,
      iconClass: "bg-lime-50 text-lime-700",
      detail: "Currently enabled",
    },
    {
      label: "Logged in today",
      value: (overview?.kpis.loggedInToday ?? 0).toLocaleString(),
      icon: Clock3,
      iconClass: "bg-sky-50 text-sky-700",
      detail: "Within the last 24 hours",
    },
  ];

  const activeUsers = overview?.kpis.activeUsers ?? 0;
  const totalUsers = overview?.kpis.totalUsers ?? 0;
  const inactiveUsers = Math.max(totalUsers - activeUsers, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Dashboard overview</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Welcome back, {fullName}</h2>
          <p className="mt-1 text-sm text-slate-500">Your platform status and recent account activity.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" />
          System operational
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07, duration: 0.32 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]"
            >
              <div className="flex items-start justify-between">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${card.iconClass}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
              </div>
              <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{card.label}</p>
              <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
            </motion.article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,.45fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Account directory</p>
              <h3 className="mt-1 font-bold text-slate-900">Recent users</h3>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </div>

          <div className="divide-y divide-slate-100">
            {overview?.recentUsers.length ? overview.recentUsers.map((user) => (
              <div key={user.username} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{user.fullName}</p>
                  <p className="truncate text-xs text-slate-400">@{user.username} · {user.role}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {user.lastLoginAt ? "Active" : "Never logged in"}
                </span>
              </div>
            )) : (
              <div className="grid min-h-48 place-items-center text-sm text-slate-400">No users found</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">User status</p>
            <h3 className="mt-1 font-bold text-slate-900">Account status</h3>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Active accounts", activeUsers, "bg-emerald-500"],
              ["Inactive accounts", inactiveUsers, "bg-slate-300"],
              ["Logged in today", overview?.kpis.loggedInToday ?? 0, "bg-lime-500"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3.5">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {label}
                </div>
                <strong className="text-lg text-slate-900">{Number(value).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
