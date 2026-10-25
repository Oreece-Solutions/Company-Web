import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { History, Download, Search } from 'lucide-react';
import { Button, Input } from '@company-web/shared/ui';
import { supabase, Tables } from '@company-web/shared/data-access';
import { useSales } from '@/contexts/SalesContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { downloadCsv } from '@/lib/csv';

const TABLE_LABELS: Record<string, string> = {
  clients: 'Client',
  contacts: 'Contact',
  deals: 'Deal',
  follow_ups: 'Follow-up',
  quotes: 'Quote',
  invoices: 'Invoice',
  payments: 'Payment',
  projects: 'Project',
  tasks: 'Task',
  prospects: 'Lead',
  services: 'Service',
  contractors: 'Contractor',
  client_systems: 'System',
  company_settings: 'Company settings',
  user_roles: 'User access',
};

const ACTION_STYLES: Record<string, string> = {
  insert: 'bg-success/10 text-success',
  update: 'bg-info/10 text-info',
  delete: 'bg-destructive/10 text-destructive',
};

const short = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
};

// Read-only history of every change to business records (written by database
// triggers; nobody can edit it). Useful for "who changed this invoice?".
export default function AuditPage() {
  const { getMemberName } = useSales();
  const [rows, setRows] = useState<Tables<'audit_log'>[]>([]);
  const [table, setTable] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(300);
    if (table) q = q.eq('table_name', table);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? rows.filter((r) => (r.label || '').toLowerCase().includes(s) || JSON.stringify(r.changes).toLowerCase().includes(s)) : rows;
  }, [rows, search]);

  const describe = (r: Tables<'audit_log'>) => {
    const changes = (r.changes || {}) as Record<string, unknown>;
    if (r.action !== 'update') return null;
    return Object.entries(changes).map(([k, v]) => {
      const [from, to] = Array.isArray(v) ? v : [undefined, v];
      return (
        <li key={k}>
          <span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span> {short(from)} → <span className="font-medium">{short(to)}</span>
        </li>
      );
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Audit trail"
        description="Every change to clients, deals, quotes, invoices, payments and more: who, what and when."
        actions={
          <Button variant="outline" className="gap-2" disabled={!visible.length}
            onClick={() => downloadCsv(`oreece-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`, visible.map((r) => ({
              when: r.changed_at, who: getMemberName(r.changed_by || undefined), record: TABLE_LABELS[r.table_name] || r.table_name,
              label: r.label, action: r.action, changes: JSON.stringify(r.changes),
            })))}>
            <Download className="h-4 w-4" />Export CSV
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="audit-search" placeholder="Search name, invoice number, value…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="w-56">
          <SelectField id="audit-table" value={table} onChange={setTable} noneLabel="All records"
            options={Object.entries(TABLE_LABELS).map(([value, label]) => ({ value, label }))} />
        </div>
      </div>

      {!loading && visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><History className="h-8 w-8 text-muted-foreground" /></div>
          <p className="font-medium">No changes recorded yet</p>
          <p className="text-sm text-muted-foreground">Changes appear here as soon as anything is created, edited or deleted.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-card">
          {visible.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:gap-4">
              <div className="w-40 shrink-0 text-muted-foreground tabular-nums">{format(parseISO(r.changed_at), 'd MMM yyyy, HH:mm')}</div>
              <div className="min-w-0 flex-1">
                <p>
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[r.action] || ''}`}>
                    {r.action === 'insert' ? 'Created' : r.action === 'update' ? 'Changed' : 'Deleted'}
                  </span>
                  <span className="text-muted-foreground">{TABLE_LABELS[r.table_name] || r.table_name}</span>{' '}
                  <span className="font-medium">{r.label || ''}</span>
                  <span className="text-muted-foreground"> · {r.changed_by ? getMemberName(r.changed_by) : 'System'}</span>
                </p>
                {r.action === 'update' && <ul className="mt-1 space-y-0.5 text-xs">{describe(r)}</ul>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
