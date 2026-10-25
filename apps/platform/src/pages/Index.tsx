import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FileText, Users, DollarSign, Clock, Plus, ArrowRight, AlertCircle, Briefcase, TrendingUp, CalendarClock, FileSignature } from 'lucide-react';
import { useSales } from '@/contexts/SalesContext';
import { useAuth } from '@/contexts/AuthContext';
import { FollowUpRow } from '@/components/crm/FollowUpPanel';
import { DealStageBadge } from '@/components/crm/Badges';
import { OPEN_DEAL_STAGES } from '@/types/crm';
import { formatMoney, formatTotals, sumByCurrency } from '@/lib/money';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@company-web/shared/ui';
import { StatusBadge, CurrencyDisplay } from '@/components/invoice/InvoiceHelpers';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { invoices, clients, getClient, company } = useAppStore();
  const { deals, followUps, quotes } = useSales();
  const { user } = useAuth();
  const fallback = company.defaultCurrency || 'NZD';
  const today = format(new Date(), 'yyyy-MM-dd');

  // Totals are kept per currency (an NZD and an LKR invoice are never added).
  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalClients = clients.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid');

    return {
      totalInvoices,
      totalClients,
      // Revenue = money received, including part-payments.
      totalRevenue: sumByCurrency(invoices, inv => inv.amountReceived || 0, inv => inv.currency),
      pendingAmount: sumByCurrency(unpaidInvoices, inv => inv.total - (inv.amountReceived || 0), inv => inv.currency),
      paidCount: paidInvoices.length,
      unpaidCount: unpaidInvoices.length,
    };
  }, [invoices, clients]);

  const sales = useMemo(() => {
    const open = deals.filter(d => OPEN_DEAL_STAGES.includes(d.stage));
    const monthEnd = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd');
    return {
      openCount: open.length,
      pipeline: sumByCurrency(open, d => d.value, d => d.currency),
      weighted: sumByCurrency(open, d => d.value * d.probability / 100, d => d.currency),
      closingSoon: open
        .filter(d => d.expectedCloseDate && d.expectedCloseDate <= monthEnd)
        .sort((a, b) => (a.expectedCloseDate || '').localeCompare(b.expectedCloseDate || ''))
        .slice(0, 5),
      myDue: followUps.filter(f => !f.completedAt && f.assignedTo === user?.id && f.dueDate <= today),
      awaitingReply: quotes.filter(q => q.status === 'sent' && !q.invoiceId && (!q.validUntil || q.validUntil >= today)),
      newLeads: clients.filter(c => c.status === 'lead').length,
    };
  }, [deals, followUps, quotes, clients, user?.id, today]);

  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [invoices]);

  const needsSetup = !company.name || !company.email;

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${company.name ? `, ${company.name}` : ''}! Here's your business overview.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/pipeline?new=1')} className="gap-2">
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
            <Button onClick={() => navigate('/invoices/new')} className="gap-2 bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </div>
        }
      />

      {/* Setup Alert */}
      {needsSetup && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-4 rounded-xl border border-warning/30 bg-warning/10 p-4"
        >
          <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Complete your company profile</p>
            <p className="text-sm text-muted-foreground">
              Add your company details to appear on invoices.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/settings')} size="sm">
            Set Up Now
          </Button>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
      >
        <motion.div variants={item}>
          <StatCard
            title="Total Revenue"
            value={<span className="text-2xl">{formatTotals(stats.totalRevenue, fallback)}</span>}
            icon={<DollarSign className="h-6 w-6" />}
            description={`Received · ${stats.paidCount} paid invoices`}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Pending Amount"
            value={<span className="text-2xl">{formatTotals(stats.pendingAmount, fallback)}</span>}
            icon={<Clock className="h-6 w-6" />}
            description={`Outstanding · ${stats.unpaidCount} invoices`}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={<FileText className="h-6 w-6" />}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            icon={<Users className="h-6 w-6" />}
          />
        </motion.div>
      </motion.div>

      {/* Sales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link to="/pipeline">
          <StatCard
            title="Open pipeline"
            value={<span className="text-2xl">{formatTotals(sales.pipeline, fallback)}</span>}
            icon={<Briefcase className="h-6 w-6" />}
            description={`${sales.openCount} open deals`}
          />
        </Link>
        <Link to="/pipeline">
          <StatCard
            title="Weighted forecast"
            value={<span className="text-2xl">{formatTotals(sales.weighted, fallback)}</span>}
            icon={<TrendingUp className="h-6 w-6" />}
            description="Value × win chance"
          />
        </Link>
        <Link to="/quotes">
          <StatCard
            title="Quotes awaiting reply"
            value={sales.awaitingReply.length}
            icon={<FileSignature className="h-6 w-6" />}
            description={formatTotals(sumByCurrency(sales.awaitingReply, q => q.total, q => q.currency), fallback)}
          />
        </Link>
        <Link to="/clients">
          <StatCard
            title="New leads"
            value={sales.newLeads}
            icon={<Users className="h-6 w-6" />}
            description="Accounts in Lead status"
          />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-muted-foreground" />My follow-ups due</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/follow-ups')} className="gap-1">All <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2 p-4">
            {sales.myDue.length === 0
              ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing due today.</p>
              : sales.myDue.slice(0, 6).map(f => {
                  const c = getClient(f.clientId);
                  return <FollowUpRow key={f.id} followUp={f} context={<> · <Link to={`/clients/${f.clientId}`} className="hover:underline">{c?.companyName || c?.name}</Link></>} />;
                })}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold"><Briefcase className="h-4 w-4 text-muted-foreground" />Closing this month</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')} className="gap-1">Pipeline <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <div className="divide-y divide-border">
            {sales.closingSoon.length === 0
              ? <p className="py-10 text-center text-sm text-muted-foreground">No open deals expected to close this month.</p>
              : sales.closingSoon.map(d => {
                  const c = getClient(d.clientId);
                  const overdue = (d.expectedCloseDate || '') < today;
                  return (
                    <Link key={d.id} to={`/deals/${d.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{d.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {c?.companyName || c?.name} · <span className={overdue ? 'font-medium text-destructive' : ''}>{overdue ? 'Overdue ' : ''}{format(new Date(`${d.expectedCloseDate}T00:00:00`), 'MMM d')}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-sm">{formatMoney(d.value, d.currency, { compact: true })}</span>
                        <DealStageBadge stage={d.stage} />
                      </span>
                    </Link>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent Invoices</h2>
            <p className="text-sm text-muted-foreground">Your latest invoice activity</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/invoices')} className="gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No invoices yet</p>
            <Button onClick={() => navigate('/invoices/new')} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first invoice
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentInvoices.map((invoice) => {
              const client = getClient(invoice.clientId);
              return (
                <Link
                  key={invoice.id}
                  to={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {client?.name || 'Unknown Client'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        <CurrencyDisplay amount={invoice.total} currency={invoice.currency} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
