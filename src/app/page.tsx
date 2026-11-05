"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, kickoff, money } from "@/lib/format";
import type { AdminBet, AdminEvent, AdminWithdrawal, SummaryReport } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, PageLoader, Stat, StatusBadge } from "@/components/ui";

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
          View all <ArrowRight className="size-3.5" />
        </Link>
      </header>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const summary = useQuery({ queryKey: ["report", "30d"], queryFn: () => api<SummaryReport>("/admin/reports/summary"), refetchInterval: 60_000 });
  const results = useQuery({ queryKey: ["events", "needs-result-dash"], queryFn: () => api<AdminEvent[]>("/admin/events", { query: { needsResult: true, limit: 6 } }) });
  const reviews = useQuery({ queryKey: ["withdrawals", "review-dash"], queryFn: () => api<AdminWithdrawal[]>("/admin/withdrawals", { query: { status: "pending_review", limit: 6 } }) });
  const bets = useQuery({ queryKey: ["bets", "recent-dash"], queryFn: () => api<AdminBet[]>("/admin/bets", { query: { limit: 8 } }), refetchInterval: 30_000 });
  const s = summary.data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={`Good day, ${user?.username}`} subtitle="Last 30 days at a glance" />
      {summary.error && <ErrorBox message={errorMessage(summary.error)} />}
      {summary.isLoading && <PageLoader />}
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Gross gaming revenue" value={money(s.totalGgr)} tone={Number(s.totalGgr) >= 0 ? "good" : "bad"} hint={`Sportsbook ${money(s.sportsbook.ggr)} · Casino ${money(s.casino.ggr)}`} />
          <Stat label="Deposits" value={money(s.payments.deposits)} hint={`${s.payments.depositors} depositors · withdrawals ${money(s.payments.withdrawalsNet)}`} />
          <Stat label="Open bet liability" value={money(s.openBetLiability)} tone="warn" hint={`${s.betsPlaced} bets placed in period`} />
          <Stat label="Customer balances" value={money(s.totalCustomerBalances)} hint={`${s.activeUsers} active · ${s.newUsers} new users`} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Awaiting results" href="/events?needsResult=1">
          {results.data?.length === 0 && <Empty title="All caught up">No started matches are waiting for a result.</Empty>}
          <ul className="divide-y divide-line/60">
            {results.data?.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.home_team} vs {e.away_team}</p>
                    <p className="text-xs text-faint">{e.league_name} · {kickoff(e.start_time)}</p>
                  </div>
                  <span className="text-xs text-muted">{e.pending_bet_legs} open legs</span>
                  <ArrowRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Withdrawals to review" href="/withdrawals">
          {reviews.data?.length === 0 && <Empty title="Queue is empty">Large withdrawals that need approval appear here.</Empty>}
          <ul className="divide-y divide-line/60">
            {reviews.data?.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{w.username}</p>
                  <p className="truncate text-xs text-faint">{w.bank_name} · {w.account_name} · {dateTime(w.created_at)}</p>
                </div>
                <span className="font-semibold tabular-nums">{money(w.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Latest bets" href="/bets">
          {bets.data?.length === 0 && <Empty title="No bets yet" />}
          {!!bets.data?.length && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>#</th><th>User</th><th>Type</th><th>Stake</th><th>Odds</th><th>Potential</th><th>Status</th><th>Placed</th></tr></thead>
                <tbody>
                  {bets.data.map((b) => (
                    <tr key={b.id}>
                      <td className="text-faint">{b.id}</td>
                      <td><Link href={`/users/${b.user_id}`} className="hover:text-brand">{b.username}</Link></td>
                      <td className="capitalize">{b.bet_type}</td>
                      <td className="tabular-nums">{money(b.stake)}</td>
                      <td className="tabular-nums">{Number(b.total_odds).toFixed(2)}</td>
                      <td className="tabular-nums">{money(b.potential_payout)}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td className="whitespace-nowrap text-xs text-faint">{dateTime(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
