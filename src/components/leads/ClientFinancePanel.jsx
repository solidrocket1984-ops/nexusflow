import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatEuro(n) {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
}

const statusLabels = {
  draft: 'Esborrany', sent: 'Enviada', paid: 'Pagada', overdue: 'Vençuda', cancelled: 'Cancel·lada',
};
const statusColors = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
};
const recurringStatusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-400',
};
const freqLabels = { monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' };

export default function ClientFinancePanel({ leadId }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-b44', leadId],
    queryFn: () => base44.entities.Invoice.filter({ lead_id: leadId }, '-issue_date'),
    enabled: !!leadId,
    initialData: [],
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ['recurring-b44', leadId],
    queryFn: () => base44.entities.RecurringPayment.filter({ lead_id: leadId }, '-start_date'),
    enabled: !!leadId,
    initialData: [],
  });

  const totalBilled = invoices.reduce((acc, i) => acc + Number(i.total_amount || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + Number(i.total_amount || 0), 0);
  const mrr = recurring.filter((r) => r.status === 'active' && r.frequency === 'monthly').reduce((acc, r) => acc + Number(r.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-xs uppercase text-emerald-700 font-medium">MRR</p>
          <p className="text-xl font-bold text-emerald-800 mt-1">{formatEuro(mrr)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <p className="text-xs uppercase text-indigo-700 font-medium">Facturat</p>
          <p className="text-xl font-bold text-indigo-800 mt-1">{formatEuro(totalBilled)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs uppercase text-slate-500 font-medium">Cobrat</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatEuro(totalPaid)}</p>
        </div>
      </div>

      {/* Invoices */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Factures ({invoices.length})</h3>
          <Button size="sm" variant="outline" asChild>
            <Link to="/Invoices">Veure totes →</Link>
          </Button>
        </div>
        {invoices.length === 0 && <p className="text-sm text-slate-400">No hi ha factures vinculades.</p>}
        {invoices.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3">Núm.</th>
                  <th className="text-left p-3">Emissió</th>
                  <th className="text-left p-3">Concepte</th>
                  <th className="text-right p-3">Total</th>
                  <th className="p-3">Estat</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium">{inv.number}</td>
                    <td className="p-3 text-slate-600">{inv.issue_date || '-'}</td>
                    <td className="p-3 text-slate-700 truncate max-w-[160px]">{inv.concept || '-'}</td>
                    <td className="p-3 text-right">{formatEuro(inv.total_amount)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[inv.status] || inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recurring payments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Pagaments recurrents ({recurring.length})</h3>
        </div>
        {recurring.length === 0 && <p className="text-sm text-slate-400">No hi ha pagaments recurrents.</p>}
        {recurring.map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">{r.description || 'Sense descripció'}</p>
              <p className="text-xs text-slate-500">{freqLabels[r.frequency] || r.frequency} · Pròxim: {r.next_billing_date || '-'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold text-slate-800">{formatEuro(r.amount)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${recurringStatusColors[r.status] || 'bg-slate-100 text-slate-500'}`}>
                {r.status === 'active' ? 'Actiu' : r.status === 'paused' ? 'Pausat' : 'Cancel·lat'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}