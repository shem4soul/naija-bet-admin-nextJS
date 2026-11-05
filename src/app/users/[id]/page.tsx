"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { AdminBet, AdminUserDetail, User } from "@/lib/types";
import { useToast } from "@/components/toast";
import { ErrorBox, Field, Modal, PageLoader, Pager, Spinner, Stat, StatusBadge, usePager } from "@/components/ui";

type Action = "status" | "kyc" | "balance" | null;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [action, setAction] = useState<Action>(null);
  const [status, setStatus] = useState<User["status"]>("active");
  const [reason, setReason] = useState("");
  const [kyc, setKyc] = useState<User["kycStatus"]>("verified");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const pager = usePager(15);

  const user = useQuery({ queryKey: ["user", id], queryFn: () => api<AdminUserDetail>(`/admin/users/${id}`) });
  const bets = useQuery({
    queryKey: ["bets", "user", id, pager.offset],
    queryFn: () => api<AdminBet[]>("/admin/bets", { query: { userId: id, limit: pager.limit, offset: pager.offset } }),
  });

  const done = (msg: string) => {
    toast(msg, "success");
    setAction(null);
    setReason("");
    setNote("");
    setAmount("");
    qc.invalidateQueries({ queryKey: ["user", id] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const setStatusM = useMutation({
    mutationFn: () => api(`/admin/users/${id}/status`, { method: "PATCH", body: { status, reason } }),
    onSuccess: () => done(`Status set to ${status}`),
  });
  const setKycM = useMutation({
    mutationFn: () => api(`/admin/users/${id}/kyc`, { method: "PATCH", body: { kycStatus: kyc, ...(note ? { note } : {}) } }),
    onSuccess: () => done(`KYC set to ${kyc}`),
  });
  const adjustM = useMutation({
    mutationFn: () => api<{ balance: string }>(`/admin/users/${id}/adjust-balance`, { method: "POST", body: { amount: Number(amount), note } }),
    onSuccess: (r) => done(`Balance is now ${money(r.balance)}`),
  });

  if (user.isLoading) return <PageLoader />;
  if (user.error) return <ErrorBox message={errorMessage(user.error)} />;
  const u = user.data!;
  const net = Number(u.stats.total_staked) - Number(u.stats.total_returned);
  const activeError = setStatusM.error ?? setKycM.error ?? adjustM.error;

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/users" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft className="size-4" /> Users</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{u.username}</h1>
          <p className="mt-1 text-sm text-muted">
            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "No name"} · {u.email} · {u.phone ?? "no phone"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-faint">
            <StatusBadge status={u.status} /> <StatusBadge status={u.kycStatus} label={`KYC ${u.kycStatus}`} />
            {u.role === "admin" && <StatusBadge status="approved" label="admin" />}
            <span>Joined {dateTime(u.createdAt)} · last login {dateTime(u.lastLoginAt)}</span>
          </div>
          {u.selfExclusionUntil && new Date(u.selfExclusionUntil) > new Date() && (
            <p className="mt-2 text-sm text-warn">Self-excluded until {dateTime(u.selfExclusionUntil)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => { setStatus(u.status); setAction("status"); }}>Change status</button>
          <button className="btn-secondary" onClick={() => { setKyc(u.kycStatus); setAction("kyc"); }}>Set KYC</button>
          <button className="btn-primary" onClick={() => setAction("balance")}>Adjust balance</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Balance" value={money(u.wallet?.balance)} />
        <Stat label="Deposited" value={money(u.stats.total_deposits)} />
        <Stat label="Withdrawn" value={money(u.stats.total_withdrawals)} />
        <Stat label="Staked" value={money(u.stats.total_staked)} hint={`${u.stats.bets_placed} bets`} />
        <Stat label="House result" value={money(net)} tone={net >= 0 ? "good" : "bad"} hint={`Returned ${money(u.stats.total_returned)}`} />
      </div>

      <section className="card mt-6 overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Bets</h2>
        {bets.isLoading && <PageLoader />}
        {bets.data?.length === 0 && <p className="p-4 text-sm text-muted">No bets.</p>}
        {!!bets.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>#</th><th>Type</th><th>Stake</th><th>Odds</th><th>Potential</th><th>Payout</th><th>Status</th><th>Placed</th></tr></thead>
              <tbody>
                {bets.data.map((b) => (
                  <tr key={b.id}>
                    <td className="text-faint">{b.id}</td>
                    <td className="capitalize">{b.bet_type}</td>
                    <td className="tabular-nums">{money(b.stake)}</td>
                    <td className="tabular-nums">{Number(b.total_odds).toFixed(2)}</td>
                    <td className="tabular-nums">{money(b.potential_payout)}</td>
                    <td className="tabular-nums">{money(b.payout)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="whitespace-nowrap text-xs text-faint">{dateTime(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} count={bets.data?.length ?? 0} />
      </section>

      <Modal open={action === "status"} onClose={() => setAction(null)} title="Change account status">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStatusM.mutate(); }}>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as User["status"])}>
              {["active", "suspended", "banned", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Reason" hint="Recorded in the audit log">
            <textarea className="input min-h-20" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          {activeError && <ErrorBox message={errorMessage(activeError)} />}
          <button className="btn-primary w-full" disabled={setStatusM.isPending}>{setStatusM.isPending ? <Spinner className="size-4 text-brand-ink" /> : "Save status"}</button>
        </form>
      </Modal>

      <Modal open={action === "kyc"} onClose={() => setAction(null)} title="Set KYC status">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setKycM.mutate(); }}>
          <Field label="KYC status">
            <select className="input" value={kyc} onChange={(e) => setKyc(e.target.value as User["kycStatus"])}>
              {["unverified", "pending", "verified", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Note (optional)" hint="e.g. provider reference or document checked">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {activeError && <ErrorBox message={errorMessage(activeError)} />}
          <button className="btn-primary w-full" disabled={setKycM.isPending}>{setKycM.isPending ? <Spinner className="size-4 text-brand-ink" /> : "Save KYC"}</button>
        </form>
      </Modal>

      <Modal open={action === "balance"} onClose={() => setAction(null)} title="Adjust balance">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (confirm(`${Number(amount) >= 0 ? "Credit" : "Debit"} ${money(Math.abs(Number(amount)))} for ${u.username}?`)) adjustM.mutate(); }}>
          <p className="text-sm text-muted">Current balance {money(u.wallet?.balance)}. Use a negative amount to debit. Adjustments are posted to the ledger and audited.</p>
          <Field label="Amount (₦)">
            <input className="input tabular-nums" required inputMode="decimal" placeholder="e.g. 2500 or -500" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.-]/g, ""))} />
          </Field>
          <Field label="Note">
            <input className="input" required placeholder="Goodwill credit — ticket 1042" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {activeError && <ErrorBox message={errorMessage(activeError)} />}
          <button className="btn-primary w-full" disabled={adjustM.isPending || !Number(amount)}>{adjustM.isPending ? <Spinner className="size-4 text-brand-ink" /> : "Post adjustment"}</button>
        </form>
      </Modal>
    </div>
  );
}
