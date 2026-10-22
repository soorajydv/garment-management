'use client';

import { useState } from 'react';
import { useApi } from '@/lib/api';
import { Empty, Notice, PageHeader, Spinner } from '@/components/ui';
import { ROLE_LABELS, fmtDateTime } from '@/lib/format';
import type { AuditEntry, Role } from '@/lib/types';

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const { data, error } = useApi<{ logs: AuditEntry[]; total: number; limit: number }>(`/audit?page=${page}&limit=50`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <PageHeader eyebrow="ACCOUNTABILITY" title="Audit log" subtitle="Every critical action: who did it and when. Entries cannot be edited." />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="card flush">
        {!data ? <Spinner /> : !data.logs.length ? <Empty>No activity yet.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
              <tbody>
                {data.logs.map((l) => (
                  <tr key={l.id}>
                    <td>{fmtDateTime(l.at)}</td>
                    <td>{l.actorName}<div className="muted small">{l.actorRole ? ROLE_LABELS[l.actorRole as Role] : ''}</div></td>
                    <td><code className="small">{l.action}</code></td>
                    <td className="wrap">{l.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="toolbar" style={{ marginTop: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button>
          <span className="small muted">Page {page} of {pages}</span>
          <button className="btn small" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older →</button>
        </div>
      )}
    </>
  );
}
