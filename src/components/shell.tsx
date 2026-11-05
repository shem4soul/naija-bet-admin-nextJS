"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  BarChart3,
  Banknote,
  CalendarClock,
  ClipboardList,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AdminEvent, AdminWithdrawal } from "@/lib/types";
import { PageLoader } from "./ui";

function useBadges() {
  const results = useQuery({
    queryKey: ["badge", "needs-result"],
    queryFn: () => api<AdminEvent[]>("/admin/events", { query: { needsResult: true, limit: 100 } }),
    refetchInterval: 60_000,
  });
  const reviews = useQuery({
    queryKey: ["badge", "pending-review"],
    queryFn: () => api<AdminWithdrawal[]>("/admin/withdrawals", { query: { status: "pending_review", limit: 100 } }),
    refetchInterval: 60_000,
  });
  return { results: results.data?.length ?? 0, reviews: reviews.data?.length ?? 0 };
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-ink">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V4l16 16V4" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-sm">Naija Sportsbook</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Back office</span>
      </span>
    </Link>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const badges = useBadges();
  const groups = [
    {
      title: "Overview",
      items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Trading",
      items: [
        { href: "/events", label: "Events & results", icon: CalendarClock, badge: badges.results },
        { href: "/leagues", label: "Leagues & odds feed", icon: Trophy },
        { href: "/liability", label: "Liability", icon: Flame },
        { href: "/bets", label: "Bets", icon: Receipt },
      ],
    },
    {
      title: "Customers",
      items: [
        { href: "/users", label: "Users", icon: Users },
        { href: "/withdrawals", label: "Withdrawals", icon: Banknote, badge: badges.reviews },
      ],
    },
    {
      title: "Compliance",
      items: [
        { href: "/reports", label: "Reports", icon: BarChart3 },
        { href: "/audit", label: "Audit log", icon: ClipboardList },
      ],
    },
  ];
  return (
    <nav className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">{g.title}</p>
          {g.items.map((i) => {
            const active = i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={onNavigate}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  active ? "bg-surface-3 font-medium text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <i.icon className={clsx("size-4", active && "text-brand")} />
                <span className="flex-1">{i.label}</span>
                {"badge" in i && !!i.badge && (
                  <span className="rounded-full bg-warn px-1.5 py-0.5 text-[10px] font-bold text-bg">{i.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLogin) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, isLogin, router, pathname]);

  if (isLogin) return <>{children}</>;
  if (loading || !user) return <div className="grid min-h-dvh place-items-center"><PageLoader /></div>;

  const sidebar = (
    <div className="flex h-full flex-col gap-8 p-4">
      <Logo />
      <div className="flex-1 overflow-y-auto">
        <Nav onNavigate={() => setOpen(false)} />
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-line p-3">
        <span className="grid size-8 place-items-center rounded-full bg-surface-3 text-sm font-bold uppercase">{user.username.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.username}</p>
          <p className="truncate text-xs text-faint">{user.email}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface/60 lg:block">{sidebar}</aside>
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="btn-ghost px-2" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-line bg-surface">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 p-1 text-muted" aria-label="Close menu">
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
