"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { SummaryReport } from "@/lib/types";
import { ErrorBox, PageHeader, PageLoader, Stat } from "@/components/ui";

const PRESETS = [
  { id: "today", label: "Today", days: 0 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "custom", label: "Custom", days: -1 },
] as const;

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeFor(preset: (typeof PRESETS)[number]["id"], from: string, to: string) {
  const end = new Date();
  if (preset === "custom") return { from: new Date(from).toISOString(), to: new Date(`${to}T23:59:59`).toISOString() };
  const start = new Date();
  if (preset === "today") start.setHours(0, 0, 0, 0);
  else start.setDate(start.getDate() - PRESETS.find((p) => p.id === preset)!.days);
  return { from: start.toISOString(), to: end.toISOString() };
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between border-b border-line/60 py-2.5 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-bold tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("30d");
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => toDateInput(new Date()));
  const [range, setRange] = useState(() => rangeFor("30d", from, to));

  const q = useQuery({
    queryKey: ["report", range.from, range.to],
    queryFn: () => api<SummaryReport>("/admin/reports/summary", { query: range }),
  });
  const s = q.data;
  const margin = s && Number(s.sportsbook.stakes) > 0 ? (Number(s.sportsbook.ggr) / Number(s.sportsbook.stakes)) * 100 : null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Reports" subtitle="Gross gaming revenue, payments and player activity for any window." />
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-3">
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button key={p.id} className="tab" data-active={preset === p.id} onClick={() => { setPreset(p.id); if (p.id !== "custom") setRange(rangeFor(p.id, from, to)); }}>{p.label}</button>
          ))}
        </div>
        {preset === "custom" && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setRange(rangeFor("custom", from, to)); }}>
            <label><span className="label">From</span><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label><span className="label">To</span><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            <button className="btn-primary">Apply</button>
          </form>
        )}
      </div>

      {q.isLoading && <PageLoader />}
      {q.error && <ErrorBox message={errorMessage(q.error)} />}
      {s && (
        <>
          <p className="mb-4 text-xs text-faint">{dateTime(s.window.from)} – {dateTime(s.window.to)}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total GGR" value={money(s.totalGgr)} tone={Number(s.totalGgr) >= 0 ? "good" : "bad"} />
            <Stat label="Sportsbook margin" value={margin === null ? "—" : `${margin.toFixed(1)}%`} hint="GGR ÷ stakes" />
            <Stat label="Bets placed" value={s.betsPlaced.toLocaleString()} />
            <Stat label="Active / new users" value={`${s.activeUsers} / ${s.newUsers}`} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="card card-pad">
              <h2 className="mb-2 font-semibold">Sportsbook</h2>
              <Row label="Stakes" value={money(s.sportsbook.stakes)} />
              <Row label="Payouts" value={money(s.sportsbook.payouts)} />
              <Row label="GGR" value={money(s.sportsbook.ggr)} strong />
            </section>
            <section className="card card-pad">
              <h2 className="mb-2 font-semibold">Casino</h2>
              <Row label="Stakes" value={money(s.casino.stakes)} />
              <Row label="Payouts" value={money(s.casino.payouts)} />
              <Row label="GGR" value={money(s.casino.ggr)} strong />
            </section>
            <section className="card card-pad">
              <h2 className="mb-2 font-semibold">Payments & balances</h2>
              <Row label={`Deposits (${s.payments.depositors} depositors)`} value={money(s.payments.deposits)} />
              <Row label="Withdrawals (net)" value={money(s.payments.withdrawalsNet)} />
              <Row label="Manual adjustments" value={money(s.adjustments)} />
              <Row label="Customer balances now" value={money(s.totalCustomerBalances)} strong />
              <Row label="Open bet liability now" value={money(s.openBetLiability)} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
