"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { MarketDefinition } from "@/lib/types";

export interface DraftMarket {
  key: string;
  type: string;
  line: string;
  odds: { selection: string; price: string }[];
}

export function useMarketCatalogue() {
  return useQuery({ queryKey: ["market-defs"], queryFn: () => api<MarketDefinition[]>("/sports/markets", { auth: false }), staleTime: Infinity });
}

let seq = 0;
export function draftFor(def: MarketDefinition | undefined, type: string): DraftMarket {
  const sels = def && Array.isArray(def.selections) ? def.selections : type === "CORRECT_SCORE" ? ["1-0", "0-0", "0-1", "OTHER"] : ["", ""];
  return { key: `m${++seq}`, type, line: def?.requiresLine ? "2.5" : "", odds: sels.map((s) => ({ selection: s, price: "" })) };
}

export function toMarketInput(m: DraftMarket) {
  return {
    type: m.type,
    ...(m.line !== "" ? { line: Number(m.line) } : {}),
    odds: m.odds.filter((o) => o.selection.trim() && o.price).map((o) => ({ selection: o.selection.trim(), price: Number(o.price) })),
  };
}

export function MarketEditor({ m, onChange, onRemove, defs }: { m: DraftMarket; onChange: (m: DraftMarket) => void; onRemove?: () => void; defs: MarketDefinition[] }) {
  const def = defs.find((d) => d.type === m.type);
  const fixed = def ? Array.isArray(def.selections) : false;
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1">
          <span className="label">Market</span>
          <select className="input" value={m.type} onChange={(e) => onChange({ ...draftFor(defs.find((d) => d.type === e.target.value), e.target.value), key: m.key })}>
            {defs.map((d) => <option key={d.type} value={d.type}>{d.name}</option>)}
          </select>
        </label>
        {def?.requiresLine && (
          <label className="w-28">
            <span className="label">Line</span>
            <input className="input tabular-nums" inputMode="decimal" value={m.line} onChange={(e) => onChange({ ...m, line: e.target.value.replace(/[^\d.-]/g, "") })} />
          </label>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} className="btn-ghost px-2.5 text-danger" aria-label="Remove market"><Trash2 className="size-4" /></button>
        )}
      </div>
      {def?.needsHalfTime && <p className="mt-2 text-xs text-warn">Settles automatically only when the half-time score is recorded.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {m.odds.map((o, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-line bg-bg p-2">
            <input
              className="w-full min-w-0 bg-transparent text-xs font-semibold uppercase outline-none disabled:opacity-80"
              value={o.selection}
              disabled={fixed}
              placeholder="Selection"
              onChange={(e) => onChange({ ...m, odds: m.odds.map((x, j) => (j === i ? { ...x, selection: e.target.value.toUpperCase() } : x)) })}
            />
            <input
              className="w-20 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-brand"
              inputMode="decimal"
              placeholder="Price"
              value={o.price}
              onChange={(e) => onChange({ ...m, odds: m.odds.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, "") } : x)) })}
            />
            {!fixed && (
              <button type="button" className="text-faint hover:text-danger" onClick={() => onChange({ ...m, odds: m.odds.filter((_, j) => j !== i) })} aria-label="Remove selection">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {!fixed && (
          <button type="button" className="btn-ghost border border-dashed border-line" onClick={() => onChange({ ...m, odds: [...m.odds, { selection: "", price: "" }] })}>
            <Plus className="size-4" /> Selection
          </button>
        )}
      </div>
      {typeof def?.selections === "string" && <p className="mt-2 text-xs text-faint">Selections: {def.selections}</p>}
    </div>
  );
}
