import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Receipt, AlertCircle } from 'lucide-react';

function formatEuro(n) {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
}

export default function FinancialPanel() {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-b44'],
    queryFn: () => base44.entities.Invoice.list('-issue_date', 200),
    initialData: [],
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ['recurring-b44'],
    queryFn: () => base44.entities.RecurringPayment.list('-start_date', 100),
    initialData: [],
  });

  const today = new Date().toISOString().slice(0, 10);

  const { mrr, totalBilled, overdue, upcoming } = useMemo(() => {
    const activeRecurring = recurring.filter((r) => r.status === 'active');
    const mrr = activeRecurring
      .filter((r) => r.frequency === 'monthly')
      .reduce((acc, r) => acc + Number(r.amount || 0), 0);

    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const totalBilled = paidInvoices.reduce((acc, i) => acc + Number(i.total_amount || 0), 0);

    const overdue = invoices.filter(
      (i) => ['sent', 'overdue'].includes(i.status) && i.due_date && i.due_date < today
    );

    const upcoming = activeRecurring
      .filter((r) => r.next_billing_date && r.next_billing_date >= today)
      .sort((a, b) => (a.next_billing_date || '').localeCompare(b.next_billing_date || ''))
      .slice(0, 5);

    return { mrr, totalBilled, overdue, upcoming };
  }, [invoices, recurring, today]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Resum financer</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          icon={TrendingUp}
          title="MRR actiu"
          value={formatEuro(mrr)}
          accent="emerald"
          to="/Billing"
        />
        <KpiCard
          icon={Receipt}
          title="Total facturat (cobrat)"
          value={formatEuro(totalBilled)}
          accent="indigo"
          to="/Invoices"
        />
        <KpiCard
          icon={AlertCircle}
          title="Factures vençudes"
          value={overdue.length}
          accent={overdue.length > 0 ? 'red' : 'slate'}
          to="/Invoices"
        />
      </div>

      {upcoming.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pròxims venciments recurrents</h3>
          {upcoming.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="text-slate-800 truncate">{r.description || 'Sense descripció'}</p>
                <p className="text-xs text-slate-500">{r.next_billing_date}</p>
              </div>
              <span className="font-semibold text-slate-900 shrink-0 ml-3">{formatEuro(r.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function KpiCard({ icon: Icon, title, value, accent, to }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <Link to={to} className={`rounded-xl border p-4 flex items-start justify-between hover:opacity-90 transition-opacity ${colors[accent]}`}>
      <div>
        <p className="text-xs uppercase font-medium opacity-80">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
      </div>
      <Icon className="w-5 h-5 opacity-60 mt-1" />
    </Link>
  );
}