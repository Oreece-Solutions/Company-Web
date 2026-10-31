import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Download } from 'lucide-react';
import { Button } from '@company-web/shared/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/contexts/StoreContext';
import { useDelivery } from '@/contexts/DeliveryContext';
import { useSalesDept } from '@/contexts/SalesDeptContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { SelectField } from '@/components/crm/SelectField';
import { hasAccess } from '@/lib/access';
import { downloadCsv } from '@/lib/csv';
import { weekRange } from '@/lib/salesWeek';
import { formatMinutes } from '@/types/delivery';

// A week of time per project and day. Log time from a project's page; this is
// where you check the week (and the founder checks the team's).
export default function TimesheetPage() {
  const { user, roles } = useAuth();
  const isAdmin = hasAccess(roles, 'admin');
  const { projects } = useAppStore();
  const { timeEntries } = useDelivery();
  const { team, memberName } = useSalesDept();
  const [weekOffset, setWeekOffset] = useState(0);
  const [who, setWho] = useState(user?.id || '');
  const { from, to } = weekRange(weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(parseISO(from), i), 'yyyy-MM-dd'));

  const entries = useMemo(() => timeEntries.filter((t) => t.workedOn >= from && t.workedOn <= to && (!who || t.userId === who)), [timeEntries, from, to, who]);
  const byProject = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const t of entries) {
      const row = map.get(t.projectId) || {};
      row[t.workedOn] = (row[t.workedOn] || 0) + t.minutes;
      map.set(t.projectId, row);
    }
    return [...map.entries()];
  }, [entries]);
  const total = entries.reduce((n, t) => n + t.minutes, 0);
  const billable = entries.filter((t) => t.billable).reduce((n, t) => n + t.minutes, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Timesheet"
        description={`${formatMinutes(total)} this week · ${formatMinutes(billable)} billable`}
        actions={
          <Button variant="outline" className="gap-2" onClick={() => downloadCsv(`oreece-time-${from}.csv`, entries.map((t) => ({
            date: t.workedOn, person: memberName(t.userId), project: projects.find((p) => p.id === t.projectId)?.name, hours: (t.minutes / 60).toFixed(2),
            billable: t.billable ? 'yes' : 'no', description: t.description,
          })))}>
            <Download className="h-4 w-4" />Export
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekOffset(weekOffset - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[180px] text-center text-sm font-medium">{format(parseISO(from), 'd MMM')} – {format(parseISO(to), 'd MMM yyyy')}</span>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekOffset(weekOffset + 1)}><ChevronRight className="h-4 w-4" /></Button>
          {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>This week</Button>}
        </div>
        {isAdmin && (
          <SelectField className="w-52" value={who} noneLabel="Everyone" onChange={setWho}
            options={team.map((m) => ({ value: m.userId, label: m.userId === user?.id ? 'Me' : m.fullName || 'Team member' }))} />
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        {byProject.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Clock className="h-8 w-8 text-muted-foreground" /></div>
            <p className="font-medium">No time logged this week</p>
            <p className="text-sm text-muted-foreground">Open a project and use "Log time".</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Project</th>
                {days.map((d) => <th key={d} className="px-2 py-2 text-center font-medium">{format(parseISO(d), 'EEE d')}</th>)}
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byProject.map(([projectId, perDay]) => {
                const p = projects.find((x) => x.id === projectId);
                const sum = Object.values(perDay).reduce((n, m) => n + m, 0);
                return (
                  <tr key={projectId}>
                    <td className="px-4 py-2"><Link to={`/projects/${projectId}`} className="font-medium hover:underline">{p?.name || 'Project'}</Link></td>
                    {days.map((d) => <td key={d} className="px-2 py-2 text-center text-muted-foreground">{perDay[d] ? formatMinutes(perDay[d]) : ''}</td>)}
                    <td className="px-4 py-2 text-right font-medium">{formatMinutes(sum)}</td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-2">Total</td>
                {days.map((d) => {
                  const m = entries.filter((t) => t.workedOn === d).reduce((n, t) => n + t.minutes, 0);
                  return <td key={d} className="px-2 py-2 text-center">{m ? formatMinutes(m) : ''}</td>;
                })}
                <td className="px-4 py-2 text-right">{formatMinutes(total)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
