"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import { marketName, selectionLabel } from "@/lib/markets";
import type { LiabilityRow } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, PageLoader, Pager, usePager } from "@/components/ui";

export default function LiabilityPage() {
  const pager = usePager(30);
  const q = useQuery({
    queryKey: ["liability", "all", pager.offset],
    queryFn: () => api<LiabilityRow[]>("/admin/reports/liability", { query: { limit: pager.limit, offset: pager.offset } }),
    refetchInterval: 30_000,
  });
  const max = Math.max(1, ...(q.data ?? []).map((r) => Number(r.single_liability ?? 0)));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Liability" subtitle="Open exposure per selection, largest first. Singles show the exact payout if the selection wins; accumulators show an upper bound." />
      <section className="card overflow-hidden">
        {q.isLoading && <PageLoader />}
        {q.error && <div className="p-4"><ErrorBox message={errorMessage(q.error)} /></div>}
        {q.data?.length === 0 && <Empty title="No open exposure">There are no unsettled bets right now.</Empty>}
        {!!q.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Event</th><th>Market</th><th>Selection</th><th className="text-right">Legs</th><th className="text-right">Stakes</th><th className="w-64">Singles liability</th><th className="text-right">Multis (upper bound)</th></tr></thead>
              <tbody>
                {q.data.map((r) => (
                  <tr key={`${r.market_id}-${r.selection}`}>
                    <td><Link href={`/events/${r.event_id}`} className="font-medium hover:text-brand">{r.home_team} vs {r.away_team}</Link><p className="text-xs text-faint">{dateTime(r.start_time)}</p></td>
                    <td className="text-xs text-muted">{marketName(r.market_type, r.line)}</td>
                    <td>{selectionLabel(r.market_type, r.selection, r.line, { home: r.home_team, away: r.away_team })}</td>
                    <td className="text-right tabular-nums">{r.legs}</td>
                    <td className="text-right tabular-nums">{money(r.stakes)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-warn" style={{ width: `${(Number(r.single_liability ?? 0) / max) * 100}%` }} /></div>
                        <span className="w-28 text-right font-semibold tabular-nums">{money(r.single_liability ?? 0)}</span>
                      </div>
                    </td>
                    <td className="text-right tabular-nums text-muted">{money(r.multi_liability_upper_bound ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} count={q.data?.length ?? 0} />
      </section>
    </div>
  );
}
