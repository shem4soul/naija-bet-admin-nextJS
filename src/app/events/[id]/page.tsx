"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarCog, ChevronLeft, Flag, Lock, LockOpen, Plus, Save, Scale } from "lucide-react";
import clsx from "clsx";
import { api, errorMessage } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import { MARKET_ORDER, marketName, selectionLabel } from "@/lib/markets";
import type { AdminBet, EventDetail, LiabilityRow, Market, ResultSummary } from "@/lib/types";
import { MarketEditor, draftFor, toMarketInput, useMarketCatalogue, type DraftMarket } from "@/components/market-builder";
import { useToast } from "@/components/toast";
import { useNow } from "@/lib/use-now";
import { ErrorBox, Field, Modal, PageLoader, Spinner, StatusBadge } from "@/components/ui";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OddsRow({ o, m, e, onSaved }: { o: Market["odds"][number]; m: Market; e: EventDetail; onSaved: () => void }) {
  const toast = useToast();
  const [price, setPrice] = useState(Number(o.price).toString());
  const dirty = Number(price) !== Number(o.price);
  const update = useMutation({
    mutationFn: (body: { price?: number; isActive?: boolean }) => api(`/admin/odds/${o.oddsId}`, { method: "PATCH", body }),
    onSuccess: () => {
      onSaved();
      toast("Price updated", "success");
    },
    onError: (err) => toast(errorMessage(err), "error"),
  });
  const editable = m.status === "open" || m.status === "suspended";
  return (
    <tr className={clsx(!o.active && "opacity-50")}>
      <td>
        <p className="font-medium">{selectionLabel(m.type, o.selection, m.line, { home: e.home_team, away: e.away_team })}</p>
        <p className="font-mono text-[11px] text-faint">{o.selection} · id {o.oddsId}</p>
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          <input
            className="w-20 rounded-md border border-line bg-bg px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-brand disabled:opacity-60"
            value={price}
            disabled={!editable}
            inputMode="decimal"
            onChange={(ev) => setPrice(ev.target.value.replace(/[^\d.]/g, ""))}
          />
          {dirty && (
            <button className="btn-primary btn-sm px-2" disabled={update.isPending || !(Number(price) >= 1.01)} onClick={() => update.mutate({ price: Number(price) })} aria-label="Save price">
              <Save className="size-3.5" />
            </button>
          )}
        </div>
      </td>
      <td>
        <button className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline disabled:no-underline" disabled={!editable || update.isPending} onClick={() => update.mutate({ isActive: !o.active })}>
          {o.active ? "Active" : "Inactive"}
        </button>
      </td>
      <td><StatusBadge status={o.result} /></td>
    </tr>
  );
}

function MarketPanel({ m, e, refresh }: { m: Market; e: EventDetail; refresh: () => void }) {
  const toast = useToast();
  const [settling, setSettling] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"winner" | "each" | "void">("winner");
  const [winner, setWinner] = useState(m.odds[0]?.selection ?? "");
  const [each, setEach] = useState<Record<string, "won" | "lost" | "void">>({});
  const [sel, setSel] = useState({ selection: "", price: "" });

  const act = useMutation({
    mutationFn: (path: "suspend" | "reopen") => api(`/admin/markets/${m.id}/${path}`, { method: "POST" }),
    onSuccess: () => refresh(),
    onError: (err) => toast(errorMessage(err), "error"),
  });
  const settle = useMutation({
    mutationFn: () =>
      api<{ legsSettled: number; slipsResolved: number; slipsPaid: number }>(`/admin/markets/${m.id}/settle`, {
        method: "POST",
        body: mode === "winner" ? { winningSelection: winner } : mode === "void" ? { voidMarket: true } : { results: Object.fromEntries(m.odds.map((o) => [o.selection, each[o.selection] ?? "lost"])) },
      }),
    onSuccess: (r) => {
      setSettling(false);
      toast(`Settled: ${r.legsSettled} legs, ${r.slipsResolved} slips resolved, ${r.slipsPaid} paid`, "success");
      refresh();
    },
  });
  const addOdds = useMutation({
    mutationFn: () => api(`/admin/markets/${m.id}/odds`, { method: "POST", body: { selection: sel.selection.trim().toUpperCase(), price: Number(sel.price) } }),
    onSuccess: () => {
      setAdding(false);
      setSel({ selection: "", price: "" });
      refresh();
    },
  });

  const unsettled = m.status === "open" || m.status === "suspended";
  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h3 className="font-semibold">{marketName(m.type, m.line, m.name)}</h3>
        <StatusBadge status={m.status} />
        <span className="font-mono text-[11px] text-faint">#{m.id}</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {m.status === "open" && <button className="btn-secondary btn-sm" disabled={act.isPending} onClick={() => act.mutate("suspend")}><Lock className="size-3.5" /> Suspend</button>}
          {m.status === "suspended" && <button className="btn-secondary btn-sm" disabled={act.isPending} onClick={() => act.mutate("reopen")}><LockOpen className="size-3.5" /> Reopen</button>}
          {unsettled && <button className="btn-secondary btn-sm" onClick={() => setAdding(true)}><Plus className="size-3.5" /> Selection</button>}
          {unsettled && <button className="btn-secondary btn-sm border-gold/40 text-gold" onClick={() => setSettling(true)}><Scale className="size-3.5" /> Settle</button>}
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Selection</th><th>Price</th><th>State</th><th>Result</th></tr></thead>
          <tbody>{m.odds.map((o) => <OddsRow key={`${o.oddsId}-${o.price}`} o={o} m={m} e={e} onSaved={refresh} />)}</tbody>
        </table>
      </div>

      <Modal open={settling} onClose={() => setSettling(false)} title={`Settle ${marketName(m.type, m.line, m.name)}`}>
        <div className="mb-4 flex gap-1">
          {(["winner", "each", "void"] as const).map((x) => (
            <button key={x} className="tab" data-active={mode === x} onClick={() => setMode(x)}>{x === "winner" ? "Single winner" : x === "each" ? "Per selection" : "Void market"}</button>
          ))}
        </div>
        {mode === "winner" && (
          <Field label="Winning selection" hint="All other selections lose.">
            <select className="input" value={winner} onChange={(ev) => setWinner(ev.target.value)}>
              {m.odds.map((o) => <option key={o.oddsId} value={o.selection}>{selectionLabel(m.type, o.selection, m.line, { home: e.home_team, away: e.away_team })}</option>)}
            </select>
          </Field>
        )}
        {mode === "each" && (
          <div className="space-y-2">
            {m.odds.map((o) => (
              <div key={o.oddsId} className="flex items-center justify-between gap-3 text-sm">
                <span>{selectionLabel(m.type, o.selection, m.line, { home: e.home_team, away: e.away_team })}</span>
                <select className="input w-28 py-1.5" value={each[o.selection] ?? "lost"} onChange={(ev) => setEach({ ...each, [o.selection]: ev.target.value as "won" | "lost" | "void" })}>
                  <option value="won">won</option><option value="lost">lost</option><option value="void">void</option>
                </select>
              </div>
            ))}
            <p className="text-xs text-faint">Use void for pushes (e.g. a whole-number handicap that lands exactly).</p>
          </div>
        )}
        {mode === "void" && <p className="text-sm text-muted">Every selection is voided. Singles are refunded and accumulators are recalculated with this leg at 1.00.</p>}
        {settle.error && <div className="mt-3"><ErrorBox message={errorMessage(settle.error)} /></div>}
        <button className="btn-primary mt-5 w-full" disabled={settle.isPending} onClick={() => confirm("Settlement pays out real money and can't be undone. Continue?") && settle.mutate()}>
          {settle.isPending ? <Spinner className="size-4 text-brand-ink" /> : "Settle market"}
        </button>
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add selection">
        <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); addOdds.mutate(); }}>
          <Field label="Selection" hint={m.type === "CORRECT_SCORE" ? 'Score like "3-1"' : "Must be valid for this market type"}>
            <input className="input uppercase" required value={sel.selection} onChange={(ev) => setSel({ ...sel, selection: ev.target.value })} />
          </Field>
          <Field label="Price">
            <input className="input tabular-nums" required inputMode="decimal" value={sel.price} onChange={(ev) => setSel({ ...sel, price: ev.target.value.replace(/[^\d.]/g, "") })} />
          </Field>
          {addOdds.error && <ErrorBox message={errorMessage(addOdds.error)} />}
          <button className="btn-primary w-full" disabled={addOdds.isPending}>Add selection</button>
        </form>
      </Modal>
    </section>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const defs = useMarketCatalogue();
  const now = useNow();
  const [modal, setModal] = useState<"result" | "cancel" | "edit" | "market" | null>(null);
  const [score, setScore] = useState({ home: "", away: "", htHome: "", htAway: "" });
  const [reason, setReason] = useState("");
  const [edit, setEdit] = useState({ homeTeam: "", awayTeam: "", startTime: "", isFeatured: false });
  const [draft, setDraft] = useState<DraftMarket | null>(null);
  const [summary, setSummary] = useState<ResultSummary | null>(null);

  const event = useQuery({ queryKey: ["event", id], queryFn: () => api<EventDetail>(`/sports/events/${id}`, { auth: false }) });
  const liability = useQuery({ queryKey: ["liability", id], queryFn: () => api<LiabilityRow[]>("/admin/reports/liability", { query: { eventId: id, limit: 20 } }) });
  const bets = useQuery({ queryKey: ["bets", "event", id], queryFn: () => api<AdminBet[]>("/admin/bets", { query: { eventId: id, limit: 20 } }) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["event", id] });
    qc.invalidateQueries({ queryKey: ["liability", id] });
    qc.invalidateQueries({ queryKey: ["bets", "event", id] });
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["badge"] });
  };

  const result = useMutation({
    mutationFn: () =>
      api<ResultSummary>(`/admin/events/${id}/result`, {
        method: "POST",
        body: {
          homeScore: Number(score.home),
          awayScore: Number(score.away),
          ...(score.htHome !== "" && score.htAway !== "" ? { htHomeScore: Number(score.htHome), htAwayScore: Number(score.htAway) } : {}),
        },
      }),
    onSuccess: (r) => {
      setModal(null);
      setSummary(r);
      refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: () => api<{ voidedMarkets: number; voidedLegs: number }>(`/admin/events/${id}/cancel`, { method: "POST", body: { reason } }),
    onSuccess: (r) => {
      setModal(null);
      toast(`Event cancelled: ${r.voidedMarkets} markets and ${r.voidedLegs} legs voided`, "success");
      refresh();
    },
  });
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/admin/events/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      setModal(null);
      toast("Event updated", "success");
      refresh();
    },
    onError: (err) => toast(errorMessage(err), "error"),
  });
  const addMarket = useMutation({
    mutationFn: () => api(`/admin/events/${id}/markets`, { method: "POST", body: toMarketInput(draft!) }),
    onSuccess: () => {
      setModal(null);
      toast("Market added", "success");
      refresh();
    },
  });

  if (event.isLoading) return <PageLoader />;
  if (event.error) return <ErrorBox message={errorMessage(event.error)} />;
  const e = event.data!;
  const started = new Date(e.start_time).getTime() <= now;
  const closedOut = e.status === "cancelled" || e.status === "finished";
  const markets = [...e.markets].sort((a, b) => (MARKET_ORDER.indexOf(a.type) + 99) % 99 - (MARKET_ORDER.indexOf(b.type) + 99) % 99 || Number(a.line ?? 0) - Number(b.line ?? 0));

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/events" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft className="size-4" /> Events</Link>

      <div className="card card-pad mb-6 flex flex-wrap items-center gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <StatusBadge status={e.status} /> <span>{e.league_name}</span> <span>·</span> <span>Kick-off {dateTime(e.start_time)}</span>
            {e.is_featured && <StatusBadge status="cashed_out" label="featured" />}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{e.home_team} <span className="text-faint">vs</span> {e.away_team}</h1>
          {e.home_score !== null && (
            <p className="mt-1 text-lg font-semibold tabular-nums">
              FT {e.home_score}–{e.away_score}{e.ht_home_score !== null && <span className="text-sm text-muted"> · HT {e.ht_home_score}–{e.ht_away_score}</span>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!closedOut && (
            <button className="btn-secondary" onClick={() => { setEdit({ homeTeam: e.home_team, awayTeam: e.away_team, startTime: toLocalInput(e.start_time), isFeatured: e.is_featured }); setModal("edit"); }}>
              <CalendarCog className="size-4" /> Edit
            </button>
          )}
          {!closedOut && !started && (
            <button className="btn-secondary" onClick={() => { setDraft(draftFor(defs.data?.find((d) => d.type === "DOUBLE_CHANCE"), "DOUBLE_CHANCE")); setModal("market"); }}>
              <Plus className="size-4" /> Add market
            </button>
          )}
          {!closedOut && <button className="btn-danger" onClick={() => setModal("cancel")}><Ban className="size-4" /> Cancel / abandon</button>}
          {!closedOut && (
            <button className="btn-primary" disabled={!started} title={started ? "" : "Available after kick-off"} onClick={() => setModal("result")}>
              <Flag className="size-4" /> Record result
            </button>
          )}
        </div>
      </div>

      {summary && (
        <section className="card card-pad mb-6 border-brand/40">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand">Result recorded: {summary.score.home}–{summary.score.away}</h2>
            <button className="text-xs text-muted hover:text-ink" onClick={() => setSummary(null)}>Dismiss</button>
          </div>
          <p className="mt-1 text-sm text-muted">
            {summary.settledMarkets.length} markets settled · {summary.settledMarkets.reduce((a, m) => a + m.slipsPaid, 0)} slips paid
          </p>
          {summary.needsManualSettlement.length > 0 && (
            <div className="mt-3 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm">
              <p className="font-semibold text-warn">Needs manual settlement</p>
              <ul className="mt-1 list-inside list-disc text-muted">
                {summary.needsManualSettlement.map((n) => <li key={n.marketId}>#{n.marketId} {n.type}: {n.reason}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {markets.length === 0 && <p className="text-sm text-muted">No markets yet.</p>}
          {markets.map((m) => <MarketPanel key={m.id} m={m} e={e} refresh={refresh} />)}
        </div>
        <aside className="space-y-6">
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 font-semibold">Exposure</h2>
            {liability.isLoading && <div className="p-4"><Spinner /></div>}
            {liability.data?.length === 0 && <p className="p-4 text-sm text-muted">No open stakes on this event.</p>}
            <ul className="divide-y divide-line/60">
              {liability.data?.map((r) => (
                <li key={`${r.market_id}-${r.selection}`} className="px-4 py-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{selectionLabel(r.market_type, r.selection, r.line, { home: r.home_team, away: r.away_team })} <span className="text-faint">· {marketName(r.market_type, r.line)}</span></span>
                    <span className="font-semibold tabular-nums text-warn">{money(r.single_liability ?? 0)}</span>
                  </div>
                  <p className="text-xs text-faint">{r.legs} legs · {money(r.stakes)} staked{r.multi_liability_upper_bound ? ` · multis up to ${money(r.multi_liability_upper_bound)}` : ""}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-4 py-3 font-semibold">Bets on this event</h2>
            {bets.data?.length === 0 && <p className="p-4 text-sm text-muted">No bets yet.</p>}
            <ul className="divide-y divide-line/60">
              {bets.data?.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/users/${b.user_id}`} className="flex-1 truncate hover:text-brand">{b.username} <span className="text-faint">#{b.id} · {b.bet_type}</span></Link>
                  <span className="tabular-nums">{money(b.stake)}</span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <Modal open={modal === "result"} onClose={() => setModal(null)} title="Record final result">
        <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); if (confirm(`Settle ${e.home_team} ${score.home}–${score.away} ${e.away_team}? This pays out winning bets.`)) result.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${e.home_team} (FT)`}><input className="input text-center text-lg font-bold" required inputMode="numeric" value={score.home} onChange={(ev) => setScore({ ...score, home: ev.target.value.replace(/\D/g, "") })} /></Field>
            <Field label={`${e.away_team} (FT)`}><input className="input text-center text-lg font-bold" required inputMode="numeric" value={score.away} onChange={(ev) => setScore({ ...score, away: ev.target.value.replace(/\D/g, "") })} /></Field>
            <Field label="Home (HT)"><input className="input text-center" inputMode="numeric" value={score.htHome} onChange={(ev) => setScore({ ...score, htHome: ev.target.value.replace(/\D/g, "") })} /></Field>
            <Field label="Away (HT)"><input className="input text-center" inputMode="numeric" value={score.htAway} onChange={(ev) => setScore({ ...score, htAway: ev.target.value.replace(/\D/g, "") })} /></Field>
          </div>
          <p className="text-xs text-faint">Half-time score is needed to settle Half-Time Result and HT/FT markets. Without it they&apos;re suspended for manual settlement.</p>
          {result.error && <ErrorBox message={errorMessage(result.error)} />}
          <button className="btn-primary w-full" disabled={result.isPending}>{result.isPending ? <Spinner className="size-4 text-brand-ink" /> : "Record & settle"}</button>
        </form>
      </Modal>

      <Modal open={modal === "cancel"} onClose={() => setModal(null)} title="Cancel or abandon event">
        <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); cancel.mutate(); }}>
          <p className="text-sm text-muted">Every market is voided. Singles are refunded and accumulators are recalculated without this match.</p>
          <Field label="Reason"><input className="input" required minLength={3} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Match abandoned (waterlogged pitch)" /></Field>
          {cancel.error && <ErrorBox message={errorMessage(cancel.error)} />}
          <button className="btn btn-sm w-full bg-danger py-2.5 text-white hover:bg-danger/90" disabled={cancel.isPending}>{cancel.isPending ? <Spinner className="size-4 text-white" /> : "Cancel event"}</button>
        </form>
      </Modal>

      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="Edit fixture">
        <form
          className="space-y-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            update.mutate({ homeTeam: edit.homeTeam.trim(), awayTeam: edit.awayTeam.trim(), startTime: new Date(edit.startTime).toISOString(), isFeatured: edit.isFeatured });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Home team"><input className="input" required value={edit.homeTeam} onChange={(ev) => setEdit({ ...edit, homeTeam: ev.target.value })} /></Field>
            <Field label="Away team"><input className="input" required value={edit.awayTeam} onChange={(ev) => setEdit({ ...edit, awayTeam: ev.target.value })} /></Field>
          </div>
          <Field label="Kick-off"><input className="input" type="datetime-local" required value={edit.startTime} onChange={(ev) => setEdit({ ...edit, startTime: ev.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={edit.isFeatured} onChange={(ev) => setEdit({ ...edit, isFeatured: ev.target.checked })} /> Featured</label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" disabled={update.isPending}>Save changes</button>
            {e.status === "scheduled" ? (
              <button type="button" className="btn-secondary" onClick={() => update.mutate({ status: "postponed" })}>Postpone</button>
            ) : e.status === "postponed" ? (
              <button type="button" className="btn-secondary" onClick={() => update.mutate({ status: "scheduled", startTime: new Date(edit.startTime).toISOString() })}>Reschedule</button>
            ) : null}
          </div>
          <p className="text-xs text-faint">Postponing suspends every market until the match is rescheduled.</p>
        </form>
      </Modal>

      <Modal open={modal === "market"} onClose={() => setModal(null)} title="Add market" wide>
        {draft && defs.data && <MarketEditor m={draft} defs={defs.data} onChange={setDraft} />}
        {addMarket.error && <div className="mt-3"><ErrorBox message={errorMessage(addMarket.error)} /></div>}
        <button className="btn-primary mt-4 w-full" disabled={addMarket.isPending || !draft || toMarketInput(draft).odds.length < 2} onClick={() => addMarket.mutate()}>
          Add market
        </button>
      </Modal>
    </div>
  );
}
