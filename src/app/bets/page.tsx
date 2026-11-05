"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { AdminBet } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, PageLoader, Pager, StatusBadge, usePager } from "@/components/ui";

export default function BetsPage() {
  const pager = usePager(30);
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [eventId, setEventId] = useState("");
  const bets = useQuery({
    queryKey: ["bets", status, userId, eventId, pager.offset],
    queryFn: () =>
      api<AdminBet[]>("/admin/bets", {
        query: { status: status || undefined, userId: userId || undefined, eventId: eventId || undefined, limit: pager.limit, offset: pager.offset },
      }),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Bets" subtitle="Every slip placed on the sportsbook." />
      <div className="card mb-4 flex flex-wrap gap-3 p-3">
        <select className="input w-auto" value={status} onChange={(e) => { pager.reset(); setStatus(e.target.value); }}>
          <option value="">Any status</option>
          {["pending", "won", "lost", "void", "cashed_out"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <input className="input w-36" placeholder="User ID" inputMode="numeric" value={userId} onChange={(e) => { pager.reset(); setUserId(e.target.value.replace(/\D/g, "")); }} />
        <input className="input w-36" placeholder="Event ID" inputMode="numeric" value={eventId} onChange={(e) => { pager.reset(); setEventId(e.target.value.replace(/\D/g, "")); }} />
      </div>
      <section className="card overflow-hidden">
        {bets.isLoading && <PageLoader />}
        {bets.error && <div className="p-4"><ErrorBox message={errorMessage(bets.error)} /></div>}
        {bets.data?.length === 0 && <Empty title="No bets match these filters" />}
        {!!bets.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>#</th><th>User</th><th>Type</th><th className="text-right">Stake</th><th className="text-right">Odds</th><th className="text-right">Potential</th><th className="text-right">Payout</th><th>Status</th><th>Code</th><th>Placed</th><th>Settled</th></tr></thead>
              <tbody>
                {bets.data.map((b) => (
                  <tr key={b.id}>
                    <td className="text-faint">{b.id}</td>
                    <td><Link href={`/users/${b.user_id}`} className="hover:text-brand">{b.username}</Link></td>
                    <td className="capitalize">{b.bet_type}</td>
                    <td className="text-right tabular-nums">{money(b.stake)}</td>
                    <td className="text-right tabular-nums">{Number(b.total_odds).toFixed(2)}</td>
                    <td className="text-right tabular-nums">{money(b.potential_payout)}</td>
                    <td className="text-right tabular-nums">{money(b.payout)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="font-mono text-xs text-faint">{b.booking_code ?? "—"}</td>
                    <td className="whitespace-nowrap text-xs text-faint">{dateTime(b.created_at)}</td>
                    <td className="whitespace-nowrap text-xs text-faint">{dateTime(b.settled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} count={bets.data?.length ?? 0} />
      </section>
    </div>
  );
}
