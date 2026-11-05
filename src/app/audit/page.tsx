"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/types";
import { Empty, ErrorBox, PageHeader, PageLoader, Pager, usePager } from "@/components/ui";

export default function AuditPage() {
  const pager = usePager(40);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ["audit", action, entityType, entityId, pager.offset],
    queryFn: () =>
      api<AuditLog[]>("/admin/audit-logs", {
        query: { action: action || undefined, entityType: entityType || undefined, entityId: entityId || undefined, limit: pager.limit, offset: pager.offset },
      }),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Audit log" subtitle="Every privileged and responsible-gambling action, newest first." />
      <div className="card mb-4 flex flex-wrap gap-3 p-3">
        <input className="input w-56" placeholder="Action, e.g. withdrawal.approve" value={action} onChange={(e) => { pager.reset(); setAction(e.target.value.trim()); }} />
        <input className="input w-44" placeholder="Entity type, e.g. user" value={entityType} onChange={(e) => { pager.reset(); setEntityType(e.target.value.trim()); }} />
        <input className="input w-36" placeholder="Entity ID" value={entityId} onChange={(e) => { pager.reset(); setEntityId(e.target.value.trim()); }} />
      </div>
      <section className="card overflow-hidden">
        {q.isLoading && <PageLoader />}
        {q.error && <div className="p-4"><ErrorBox message={errorMessage(q.error)} /></div>}
        {q.data?.length === 0 && <Empty title="No entries" />}
        {!!q.data?.length && (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th className="w-8"></th><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>IP</th></tr></thead>
              <tbody>
                {q.data.map((l) => (
                  <Fragment key={l.id}>
                    <tr className="cursor-pointer hover:bg-surface-2/60" onClick={() => setOpen(open === l.id ? null : l.id)}>
                      <td>{open === l.id ? <ChevronDown className="size-4 text-muted" /> : <ChevronRight className="size-4 text-faint" />}</td>
                      <td className="whitespace-nowrap text-xs">{dateTime(l.created_at)}</td>
                      <td>{l.actor_username ?? (l.actor_id ? `#${l.actor_id}` : "system")}</td>
                      <td><code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs">{l.action}</code></td>
                      <td className="text-xs text-muted">{l.entity_type ? `${l.entity_type} #${l.entity_id}` : "—"}</td>
                      <td className="font-mono text-xs text-faint">{l.ip ?? "—"}</td>
                    </tr>
                    {open === l.id && (
                      <tr>
                        <td colSpan={6} className="bg-bg">
                          <pre className="overflow-auto font-mono text-xs text-muted">{JSON.stringify(l.metadata, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} count={q.data?.length ?? 0} />
      </section>
    </div>
  );
}
