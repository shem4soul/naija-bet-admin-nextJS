"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { AdminWithdrawal, WithdrawalStatus } from "@/lib/types";
import { useToast } from "@/components/toast";
import { Empty, ErrorBox, Field, Modal, PageHeader, PageLoader, Pager, Spinner, StatusBadge, usePager } from "@/components/ui";

const TABS: { id: WithdrawalStatus | ""; label: string }[] = [
  { id: "pending_review", label: "Needs review" },
  { id: "processing", label: "Processing" },
  { id: "success", label: "Paid" },
  { id: "failed", label: "Failed" },
  { id: "rejected", label: "Rejected" },
  { id: "", label: "All" },
];

export default function WithdrawalsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const pager = usePager(25);
  const [status, setStatus] = useState<WithdrawalStatus | "">("pending_review");
  const [rejecting, setRejecting] = useState<AdminWithdrawal | null>(null);
  const [detail, setDetail] = useState<AdminWithdrawal | null>(null);
  const [reason, setReason] = useState("");

  const list = useQuery({
    queryKey: ["withdrawals", status, pager.offset],
    queryFn: () => api<AdminWithdrawal[]>("/admin/withdrawals", { query: { status: status || undefined, limit: pager.limit, offset: pager.offset } }),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["withdrawals"] });
    qc.invalidateQueries({ queryKey: ["badge"] });
  };

  const approve = useMutation({
    mutationFn: (w: AdminWithdrawal) => api<AdminWithdrawal>(`/admin/withdrawals/${w.id}/approve`, { method: "POST" }),
    onSuccess: (w) => {
      toast(`Approved ${money(w.amount)} for ${w.username} — sent to Paystack`, "success");
      refresh();
    },
    onError: (err) => toast(errorMessage(err), "error"),
  });
  const reject = useMutation({
    mutationFn: () => api<AdminWithdrawal>(`/admin/withdrawals/${rejecting!.id}/reject`, { method: "POST", body: { reason } }),
    onSuccess: (w) => {
      toast(`Rejected and refunded ${money(w.amount)} to ${w.username}`, "success");
      setRejecting(null);
      setReason("");
      refresh();
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Withdrawals" subtitle="Large withdrawals wait here for approval. Approving sends a Paystack transfer; rejecting refunds the customer's wallet." />
      <div className="-mx-1 mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.label} className="tab" data-active={status === t.id} onClick={() => { pager.reset(); setStatus(t.id); }}>{t.label}</button>
        ))}
      </div>
      <section className="card overflow-hidden">
        {list.isLoading && <PageLoader />}
        {list.error && <div className="p-4"><ErrorBox message={errorMessage(list.error)} /></div>}
        {list.data?.length === 0 && <Empty title={status === "pending_review" ? "Nothing to review" : "No withdrawals"} />}
        {!!list.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>#</th><th>Customer</th><th>KYC</th><th className="text-right">Amount</th><th>Bank account</th><th>Status</th><th>Requested</th><th></th></tr></thead>
              <tbody>
                {list.data.map((w) => (
                  <tr key={w.id}>
                    <td className="text-faint">{w.id}</td>
                    <td><Link href={`/users/${w.user_id}`} className="font-medium hover:text-brand">{w.username}</Link><p className="text-xs text-faint">{w.email}</p></td>
                    <td><StatusBadge status={w.kyc_status} /></td>
                    <td className="text-right font-semibold tabular-nums">{money(w.amount)}</td>
                    <td className="text-xs"><p>{w.account_name}</p><p className="text-faint">{w.bank_name} · {w.account_number}</p></td>
                    <td><StatusBadge status={w.status} />{w.failure_reason && <p className="mt-1 max-w-48 text-xs text-danger">{w.failure_reason}</p>}</td>
                    <td className="whitespace-nowrap text-xs text-faint">{dateTime(w.created_at)}</td>
                    <td className="whitespace-nowrap text-right">
                      {w.status === "pending_review" ? (
                        <div className="flex justify-end gap-1.5">
                          <button className="btn-danger btn-sm" onClick={() => setRejecting(w)}><X className="size-3.5" /> Reject</button>
                          <button
                            className="btn-primary btn-sm"
                            disabled={approve.isPending}
                            onClick={() => confirm(`Send ${money(w.amount)} to ${w.account_name} (${w.bank_name})?`) && approve.mutate(w)}
                          >
                            {approve.isPending && approve.variables?.id === w.id ? <Spinner className="size-3.5 text-brand-ink" /> : <Check className="size-3.5" />} Approve
                          </button>
                        </div>
                      ) : (
                        <button className="btn-ghost btn-sm" onClick={() => setDetail(w)}>Details</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} count={list.data?.length ?? 0} />
      </section>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject withdrawal">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); reject.mutate(); }}>
          <p className="text-sm text-muted">{money(rejecting?.amount)} will be returned to {rejecting?.username}&apos;s wallet.</p>
          <Field label="Reason" hint="Recorded in the audit log"><input className="input" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Source of funds check failed" /></Field>
          {reject.error && <ErrorBox message={errorMessage(reject.error)} />}
          <button className="btn btn-sm w-full bg-danger py-2.5 text-white hover:bg-danger/90" disabled={reject.isPending}>{reject.isPending ? <Spinner className="size-4 text-white" /> : "Reject & refund"}</button>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Withdrawal #${detail?.id}`} wide>
        {detail && (
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
              <dt className="text-muted">Reference</dt><dd className="font-mono text-xs">{detail.reference}</dd>
              <dt className="text-muted">Transfer code</dt><dd className="font-mono text-xs">{detail.transfer_code ?? "—"}</dd>
              <dt className="text-muted">Reviewed</dt><dd>{detail.reviewed_at ? `${dateTime(detail.reviewed_at)} by #${detail.reviewed_by}` : "—"}</dd>
              <dt className="text-muted">Updated</dt><dd>{dateTime(detail.updated_at)}</dd>
            </dl>
            {detail.gateway_response && (
              <div>
                <p className="label">Last Paystack response</p>
                <pre className="max-h-64 overflow-auto rounded-lg bg-bg p-3 font-mono text-xs text-muted">{JSON.stringify(detail.gateway_response, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
