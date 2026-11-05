"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/shell";
import { Field, Spinner } from "@/components/ui";

function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const nextParam = useSearchParams().get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && nextParam !== "/login" ? nextParam : "/";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, router, next]);

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card card-pad sm:p-7">
          <h1 className="text-xl font-bold">Sign in to the back office</h1>
          <p className="mt-1 text-sm text-muted">Admin accounts only. Every action is recorded in the audit log.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await login(identifier.trim(), password);
                router.replace(next);
              } catch (err) {
                setError(err instanceof ApiError && err.code === "INVALID_CREDENTIALS" ? "Wrong login or password." : errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email or username">
              <input className="input" autoComplete="username" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </Field>
            <Field label="Password">
              <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy ? <Spinner className="size-5 text-brand-ink" /> : "Sign in"}
            </button>
          </form>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
          <ShieldCheck className="size-3.5" /> Use a strong, unique password for admin accounts
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
