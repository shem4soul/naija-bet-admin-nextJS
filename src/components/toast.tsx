"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import clsx from "clsx";

type Kind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

const ToastContext = createContext<((message: string, kind?: Kind) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? TriangleAlert : Info;
          return (
            <div
              key={t.id}
              className={clsx(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl animate-pop",
                t.kind === "success" && "border-brand/40 bg-[#0c2a1c]",
                t.kind === "error" && "border-danger/40 bg-[#2a1212]",
                t.kind === "info" && "border-line bg-surface-2",
              )}
            >
              <Icon
                className={clsx(
                  "mt-0.5 size-4 shrink-0",
                  t.kind === "success" && "text-brand",
                  t.kind === "error" && "text-danger",
                  t.kind === "info" && "text-info",
                )}
              />
              <p className="flex-1">{t.message}</p>
              <button
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-muted hover:text-ink"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
