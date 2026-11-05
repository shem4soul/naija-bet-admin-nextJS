"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { AdminLeague, EventDetail } from "@/lib/types";
import { MarketEditor, draftFor, toMarketInput, useMarketCatalogue, type DraftMarket } from "@/components/market-builder";
import { useToast } from "@/components/toast";
import { ErrorBox, Field, PageHeader, PageLoader, Spinner } from "@/components/ui";

function defaultKickoff() {
  const d = new Date(Date.now() + 2 * 86_400_000);
  d.setMinutes(0, 0, 0);
  d.setHours(16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewEventPage() {
  const router = useRouter();
  const toast = useToast();
  const leagues = useQuery({ queryKey: ["admin-leagues"], queryFn: () => api<AdminLeague[]>("/admin/leagues") });
  const defs = useMarketCatalogue();
  const [form, setForm] = useState({ leagueId: "", homeTeam: "", awayTeam: "", startTime: defaultKickoff(), isFeatured: false });
  const [markets, setMarkets] = useState<DraftMarket[] | null>(null);

  // Seed the builder with the three most popular markets once the catalogue loads.
  const list: DraftMarket[] =
    markets ??
    (defs.data
      ? ["1X2", "OVER_UNDER", "BTTS"].map((t) => draftFor(defs.data!.find((d) => d.type === t), t))
      : []);

  const create = useMutation({
    mutationFn: () =>
      api<EventDetail>("/admin/events", {
        method: "POST",
        body: {
          leagueId: Number(form.leagueId),
          homeTeam: form.homeTeam.trim(),
          awayTeam: form.awayTeam.trim(),
          startTime: new Date(form.startTime).toISOString(),
          isFeatured: form.isFeatured,
          markets: list.map(toMarketInput).filter((m) => m.odds.length >= 2),
        },
      }),
    onSuccess: (e) => {
      toast(`Created ${e.home_team} vs ${e.away_team}`, "success");
      router.push(`/events/${e.id}`);
    },
  });

  if (leagues.isLoading || defs.isLoading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/events" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft className="size-4" /> Events</Link>
      <PageHeader title="New fixture" subtitle="Create a match and price its markets in one step. Markets with fewer than two priced selections are skipped." />
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <section className="card card-pad grid gap-4 sm:grid-cols-2">
          <Field label="League">
            <select className="input" required value={form.leagueId} onChange={(e) => setForm({ ...form, leagueId: e.target.value })}>
              <option value="">Choose a league</option>
              {leagues.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Kick-off (your local time)">
            <input className="input" type="datetime-local" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </Field>
          <Field label="Home team">
            <input className="input" required value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} placeholder="Enyimba" />
          </Field>
          <Field label="Away team">
            <input className="input" required value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} placeholder="Kano Pillars" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
            Feature on the home page
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Markets</h2>
          {list.map((m, i) => (
            <MarketEditor
              key={m.key}
              m={m}
              defs={defs.data ?? []}
              onChange={(next) => setMarkets(list.map((x, j) => (j === i ? next : x)))}
              onRemove={() => setMarkets(list.filter((_, j) => j !== i))}
            />
          ))}
          <button type="button" className="btn-secondary" onClick={() => setMarkets([...list, draftFor(defs.data?.find((d) => d.type === "DOUBLE_CHANCE"), "DOUBLE_CHANCE")])}>
            <Plus className="size-4" /> Add market
          </button>
        </section>

        {create.error && <ErrorBox message={errorMessage(create.error)} />}
        <div className="flex justify-end gap-2">
          <Link href="/events" className="btn-secondary">Cancel</Link>
          <button className="btn-primary" disabled={create.isPending}>{create.isPending ? <Spinner className="size-4 text-brand-ink" /> : "Create fixture"}</button>
        </div>
      </form>
    </div>
  );
}
