import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FileText, Users, DollarSign, Clock, Plus, ArrowRight, AlertCircle } from 'lucide-react';
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

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalClients = clients.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
    
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const pendingAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      totalInvoices,
      totalClients,
      totalRevenue,
      pendingAmount,
      paidCount: paidInvoices.length,
      unpaidCount: unpaidInvoices.length,
    };
  }, [invoices, clients]);

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
          <Button onClick={() => navigate('/invoices/new')} className="gap-2 bg-accent hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
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
            value={<CurrencyDisplay amount={stats.totalRevenue} currency="LKR" />}
            icon={<DollarSign className="h-6 w-6" />}
            description={`${stats.paidCount} paid invoices`}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            title="Pending Amount"
            value={<CurrencyDisplay amount={stats.pendingAmount} currency="LKR" />}
            icon={<Clock className="h-6 w-6" />}
            description={`${stats.unpaidCount} unpaid invoices`}
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
