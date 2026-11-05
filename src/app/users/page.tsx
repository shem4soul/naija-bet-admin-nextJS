"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { AdminUser } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, PageLoader, Pager, StatusBadge, usePager } from "@/components/ui";

export default function UsersPage() {
  const pager = usePager(25);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [kyc, setKyc] = useState("");

  const users = useQuery({
    queryKey: ["users", q, status, kyc, pager.offset],
    queryFn: () =>
      api<AdminUser[]>("/admin/users", { query: { search: q || undefined, status: status || undefined, kycStatus: kyc || undefined, limit: pager.limit, offset: pager.offset } }),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Users" subtitle="Search customers, review KYC and manage account status." />
      <div className="card mb-4 flex flex-wrap gap-3 p-3">
        <form
          className="relative min-w-60 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            pager.reset();
            setQ(search.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input className="input pl-9" placeholder="Username, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <select className="input w-auto" value={status} onChange={(e) => { pager.reset(); setStatus(e.target.value); }}>
          <option value="">Any status</option>
          {["active", "suspended", "banned", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={kyc} onChange={(e) => { pager.reset(); setKyc(e.target.value); }}>
          <option value="">Any KYC</option>
          {["unverified", "pending", "verified", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <section className="card overflow-hidden">
        {users.isLoading && <PageLoader />}
        {users.error && <div className="p-4"><ErrorBox message={errorMessage(users.error)} /></div>}
        {users.data?.length === 0 && <Empty title="No users match these filters" />}
        {!!users.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>User</th><th>Contact</th><th>Status</th><th>KYC</th><th className="text-right">Balance</th><th>Joined</th></tr></thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-2/60">
                    <td>
                      <Link href={`/users/${u.id}`} className="font-medium hover:text-brand">{u.username}</Link>
                      <p className="text-xs text-faint">#{u.id}{u.role === "admin" ? " · admin" : ""}{[u.firstName, u.lastName].filter(Boolean).length ? ` · ${[u.firstName, u.lastName].filter(Boolean).join(" ")}` : ""}</p>
                    </td>
                    <td className="text-xs text-muted"><p>{u.email}</p><p>{u.phone ?? "—"}</p></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td><StatusBadge status={u.kycStatus} /></td>
                    <td className="text-right font-semibold tabular-nums">{money(u.balance)}</td>
                    <td className="whitespace-nowrap text-xs text-faint">{dateTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} count={users.data?.length ?? 0} />
      </section>
    </div>
  );
}
