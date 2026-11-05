"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("size-5 animate-spin text-muted", className)} />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-40 place-items-center">
      <Spinner className="size-7" />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

const BADGE: Record<string, string> = {
  won: "bg-brand/15 text-brand",
  success: "bg-brand/15 text-brand",
  verified: "bg-brand/15 text-brand",
  active: "bg-brand/15 text-brand",
  open: "bg-brand/15 text-brand",
  scheduled: "bg-info/15 text-info",
  finished: "bg-surface-3 text-muted",
  settled: "bg-surface-3 text-muted",
  lost: "bg-danger/15 text-danger",
  failed: "bg-danger/15 text-danger",
  rejected: "bg-danger/15 text-danger",
  banned: "bg-danger/15 text-danger",
  cancelled: "bg-danger/15 text-danger",
  closed: "bg-danger/15 text-danger",
  live: "bg-danger/15 text-danger",
  pending: "bg-warn/15 text-warn",
  pending_review: "bg-warn/15 text-warn",
  suspended: "bg-warn/15 text-warn",
  postponed: "bg-warn/15 text-warn",
  unverified: "bg-surface-3 text-muted",
  processing: "bg-info/15 text-info",
  approved: "bg-info/15 text-info",
  cashed_out: "bg-gold/15 text-gold",
  void: "bg-surface-3 text-muted",
  reversed: "bg-surface-3 text-muted",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", BADGE[status] ?? "bg-surface-3 text-muted")}>
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={clsx("card card-pad w-full animate-pop", wide ? "max-w-2xl" : "max-w-md")} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Offset pagination for list endpoints (limit/offset). */
export function usePager(limit = 25) {
  const [offset, setOffset] = useState(0);
  return { limit, offset, setOffset, reset: () => setOffset(0) };
}

export function Pager({ pager, count }: { pager: ReturnType<typeof usePager>; count: number }) {
  const page = Math.floor(pager.offset / pager.limit) + 1;
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
      <span>Page {page}</span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={pager.offset === 0} onClick={() => pager.setOffset(Math.max(0, pager.offset - pager.limit))}>
          <ChevronLeft className="size-3.5" /> Prev
        </button>
        <button className="btn-secondary btn-sm" disabled={count < pager.limit} onClick={() => pager.setOffset(pager.offset + pager.limit)}>
          Next <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="card card-pad">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={clsx("mt-2 text-2xl font-bold tabular-nums tracking-tight", tone === "good" && "text-brand", tone === "bad" && "text-danger", tone === "warn" && "text-warn")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
