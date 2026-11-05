"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Star } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { AdminEvent, AdminLeague } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, PageLoader, Pager, StatusBadge, usePager } from "@/components/ui";

const STATUSES = ["scheduled", "live", "finished", "cancelled", "postponed"];

function EventsList() {
  const params = useSearchParams();
  const pager = usePager(25);
  const [status, setStatus] = useState("");
  const [league, setLeague] = useState("");
  const [needsResult, setNeedsResult] = useState(params.get("needsResult") === "1");

  const leagues = useQuery({ queryKey: ["admin-leagues"], queryFn: () => api<AdminLeague[]>("/admin/leagues") });
  const events = useQuery({
    queryKey: ["events", status, league, needsResult, pager.offset],
    queryFn: () =>
      api<AdminEvent[]>("/admin/events", {
        query: { status: status || undefined, league: league || undefined, needsResult: needsResult || undefined, limit: pager.limit, offset: pager.offset },
      }),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Events & results"
        subtitle="Fixtures, prices and settlement. Record the final score to settle every supported market."
        actions={<Link href="/events/new" className="btn-primary"><Plus className="size-4" /> New fixture</Link>}
      />
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <select className="input w-auto" value={league} onChange={(e) => { pager.reset(); setLeague(e.target.value); }}>
          <option value="">All leagues</option>
          {leagues.data?.map((l) => <option key={l.id} value={l.slug}>{l.name}</option>)}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => { pager.reset(); setStatus(e.target.value); }}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={needsResult} onChange={(e) => { pager.reset(); setNeedsResult(e.target.checked); }} />
          Needs result only
        </label>
      </div>

      <section className="card overflow-hidden">
        {events.isLoading && <PageLoader />}
        {events.error && <div className="p-4"><ErrorBox message={errorMessage(events.error)} /></div>}
        {events.data?.length === 0 && <Empty title="No events match these filters" />}
        {!!events.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>#</th><th>Fixture</th><th>League</th><th>Kick-off</th><th>Status</th><th>Score</th><th className="text-right">Unsettled mkts</th><th className="text-right">Open legs</th><th>Source</th></tr></thead>
              <tbody>
                {events.data.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/60">
                    <td className="text-faint">{e.id}</td>
                    <td>
                      <Link href={`/events/${e.id}`} className="flex items-center gap-1.5 font-medium hover:text-brand">
                        {e.is_featured && <Star className="size-3.5 fill-gold text-gold" />}
                        {e.home_team} vs {e.away_team}
                      </Link>
                    </td>
                    <td className="text-xs text-muted">{e.league_name}</td>
                    <td className="whitespace-nowrap text-xs">{dateTime(e.start_time)}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="tabular-nums">{e.home_score !== null ? `${e.home_score}–${e.away_score}` : "—"}</td>
                    <td className="text-right tabular-nums">{e.unsettled_markets}</td>
                    <td className="text-right tabular-nums">{e.pending_bet_legs}</td>
                    <td className="text-xs text-faint">{e.odds_provider ?? "manual"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} count={events.data?.length ?? 0} />
      </section>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EventsList />
    </Suspense>
  );
}
