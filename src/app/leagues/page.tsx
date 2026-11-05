"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { ApiError, api, errorMessage } from "@/lib/api";
import type { AdminLeague, OddsSyncSummary, Sport } from "@/lib/types";
import { useToast } from "@/components/toast";
import { ErrorBox, Field, Modal, PageHeader, PageLoader, Spinner, StatusBadge } from "@/components/ui";

interface EditState {
  id?: number;
  sportId: string;
  slug: string;
  name: string;
  shortName: string;
  country: string;
  countryCode: string;
  providerSlug: string;
  syncEnabled: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: string;
}

const blank: EditState = { sportId: "", slug: "", name: "", shortName: "", country: "", countryCode: "", providerSlug: "", syncEnabled: false, isFeatured: false, isActive: true, sortOrder: "100" };

function ProviderLeagues({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (slug: string) => void }) {
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["provider-leagues"],
    queryFn: () => api<{ slug: string; name: string; country: string | null }[]>("/admin/odds-provider/leagues", { query: { sport: "football" } }),
    enabled: open,
    staleTime: 10 * 60_000,
  });
  const rows = (q.data ?? []).filter((l) => `${l.name} ${l.country ?? ""} ${l.slug}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title="Odds provider leagues" wide>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input className="input pl-9" placeholder="Filter by name or country" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {q.isLoading && <PageLoader />}
      {q.error && (
        <ErrorBox
          message={q.error instanceof ApiError && q.error.code === "ODDS_FEED_DISABLED" ? "The odds feed isn't configured. Set ODDS_API_KEY on the API server." : errorMessage(q.error)}
        />
      )}
      <ul className="max-h-96 divide-y divide-line/60 overflow-y-auto">
        {rows.slice(0, 200).map((l) => (
          <li key={l.slug}>
            <button className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left text-sm hover:bg-surface-2" onClick={() => onPick(l.slug)}>
              <span>{l.name} <span className="text-faint">{l.country}</span></span>
              <code className="font-mono text-xs text-muted">{l.slug}</code>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export default function LeaguesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [picker, setPicker] = useState(false);
  const [syncResult, setSyncResult] = useState<OddsSyncSummary[] | null>(null);

  const leagues = useQuery({ queryKey: ["admin-leagues"], queryFn: () => api<AdminLeague[]>("/admin/leagues") });
  const sports = useQuery({ queryKey: ["sports"], queryFn: () => api<Sport[]>("/sports", { auth: false }) });

  const save = useMutation({
    mutationFn: (s: EditState) =>
      s.id
        ? api(`/admin/leagues/${s.id}`, {
            method: "PATCH",
            body: {
              name: s.name,
              ...(s.shortName ? { shortName: s.shortName } : {}),
              providerSlug: s.providerSlug || null,
              syncEnabled: s.syncEnabled,
              isFeatured: s.isFeatured,
              isActive: s.isActive,
              sortOrder: Number(s.sortOrder),
            },
          })
        : api("/admin/leagues", {
            method: "POST",
            body: {
              sportId: Number(s.sportId),
              slug: s.slug,
              name: s.name,
              ...(s.shortName ? { shortName: s.shortName } : {}),
              ...(s.country ? { country: s.country } : {}),
              ...(s.countryCode ? { countryCode: s.countryCode.toUpperCase() } : {}),
              ...(s.providerSlug ? { providerSlug: s.providerSlug } : {}),
              syncEnabled: s.syncEnabled,
              isFeatured: s.isFeatured,
              sortOrder: Number(s.sortOrder),
            },
          }),
    onSuccess: () => {
      setEdit(null);
      toast("League saved", "success");
      qc.invalidateQueries({ queryKey: ["admin-leagues"] });
    },
  });

  const sync = useMutation({
    mutationFn: (slugs?: string[]) => api<OddsSyncSummary[]>("/admin/odds-sync", { method: "POST", body: slugs ? { leagues: slugs } : {} }),
    onSuccess: (r) => {
      setSyncResult(r);
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err) => toast(errorMessage(err), "error"),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Leagues & odds feed"
        subtitle="Control which competitions appear, what's featured, and which leagues sync fixtures and prices from odds-api.io."
        actions={
          <>
            <button className="btn-secondary" disabled={sync.isPending} onClick={() => sync.mutate(undefined)}>
              {sync.isPending ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />} Sync all enabled
            </button>
            <button className="btn-primary" onClick={() => setEdit({ ...blank, sportId: String(sports.data?.[0]?.id ?? "") })}><Plus className="size-4" /> New league</button>
          </>
        }
      />

      {syncResult && (
        <section className="card card-pad mb-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Sync results</h2><button className="text-xs text-muted" onClick={() => setSyncResult(null)}>Dismiss</button></div>
          {syncResult.length === 0 && <p className="text-sm text-muted">No leagues have sync enabled.</p>}
          <ul className="space-y-1 text-sm">
            {syncResult.map((s) => (
              <li key={s.league}>
                <span className="font-medium">{s.league}</span>: {s.eventsSeen} seen, {s.eventsCreated} new events, {s.marketsCreated} markets, {s.pricesUpdated} prices, {s.resultsRecorded} results
                {s.errors.length > 0 && <span className="text-danger"> · {s.errors.join("; ")}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden">
        {leagues.isLoading && <PageLoader />}
        {leagues.error && <div className="p-4"><ErrorBox message={errorMessage(leagues.error)} /></div>}
        {!!leagues.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>League</th><th>Slug</th><th>Provider slug</th><th>Feed</th><th>Featured</th><th>Visible</th><th>Order</th><th></th></tr></thead>
              <tbody>
                {leagues.data.map((l) => (
                  <tr key={l.id}>
                    <td><p className="font-medium">{l.name}</p><p className="text-xs text-faint">{l.country ?? "International"} · {l.sport}</p></td>
                    <td className="font-mono text-xs text-muted">{l.slug}</td>
                    <td className="font-mono text-xs text-muted">{l.provider_slug ?? "—"}</td>
                    <td>{l.sync_enabled ? <StatusBadge status="active" label="syncing" /> : <StatusBadge status="void" label="off" />}</td>
                    <td>{l.is_featured ? "★" : "—"}</td>
                    <td>{l.is_active ? <StatusBadge status="active" label="yes" /> : <StatusBadge status="banned" label="hidden" />}</td>
                    <td className="tabular-nums">{l.sort_order}</td>
                    <td className="whitespace-nowrap text-right">
                      {l.sync_enabled && (
                        <button className="btn-ghost btn-sm" disabled={sync.isPending} onClick={() => sync.mutate([l.slug])} title="Sync now"><RefreshCw className="size-3.5" /></button>
                      )}
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() =>
                          setEdit({
                            id: l.id,
                            sportId: String(l.sport_id),
                            slug: l.slug,
                            name: l.name,
                            shortName: l.short_name ?? "",
                            country: l.country ?? "",
                            countryCode: l.country_code ?? "",
                            providerSlug: l.provider_slug ?? "",
                            syncEnabled: l.sync_enabled,
                            isFeatured: l.is_featured,
                            isActive: l.is_active,
                            sortOrder: String(l.sort_order),
                          })
                        }
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.name}` : "New league"} wide>
        {edit && (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }}>
            {!edit.id && (
              <>
                <Field label="Sport">
                  <select className="input" required value={edit.sportId} onChange={(e) => setEdit({ ...edit, sportId: e.target.value })}>
                    {sports.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Slug" hint="URL id, e.g. caf-champions-league">
                  <input className="input font-mono" required pattern="[a-z0-9-]+" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value.toLowerCase() })} />
                </Field>
              </>
            )}
            <Field label="Name"><input className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Short name"><input className="input" value={edit.shortName} onChange={(e) => setEdit({ ...edit, shortName: e.target.value })} /></Field>
            {!edit.id && (
              <>
                <Field label="Country"><input className="input" value={edit.country} onChange={(e) => setEdit({ ...edit, country: e.target.value })} /></Field>
                <Field label="Country code" hint="2 letters, e.g. NG"><input className="input uppercase" maxLength={2} value={edit.countryCode} onChange={(e) => setEdit({ ...edit, countryCode: e.target.value })} /></Field>
              </>
            )}
            <Field label="Provider slug (odds-api.io)">
              <div className="flex gap-2">
                <input className="input font-mono" value={edit.providerSlug} onChange={(e) => setEdit({ ...edit, providerSlug: e.target.value })} />
                <button type="button" className="btn-secondary shrink-0" onClick={() => setPicker(true)}>Browse</button>
              </div>
            </Field>
            <Field label="Sort order"><input className="input tabular-nums" inputMode="numeric" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value.replace(/\D/g, "") })} /></Field>
            <div className="flex flex-wrap gap-5 text-sm sm:col-span-2">
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={edit.syncEnabled} onChange={(e) => setEdit({ ...edit, syncEnabled: e.target.checked })} /> Sync from odds feed</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={edit.isFeatured} onChange={(e) => setEdit({ ...edit, isFeatured: e.target.checked })} /> Featured</label>
              {edit.id && <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Visible to players</label>}
            </div>
            {save.error && <div className="sm:col-span-2"><ErrorBox message={errorMessage(save.error)} /></div>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn-primary" disabled={save.isPending}>{save.isPending ? <Spinner className="size-4 text-brand-ink" /> : "Save league"}</button>
            </div>
          </form>
        )}
      </Modal>
      <ProviderLeagues open={picker} onClose={() => setPicker(false)} onPick={(slug) => { setEdit((e) => (e ? { ...e, providerSlug: slug } : e)); setPicker(false); }} />
    </div>
  );
}
