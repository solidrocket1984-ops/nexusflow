import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useClients } from '@/lib/useFinanceData';
import { formatEuro } from '@/lib/finance';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Clients from base44 Lead entity (lifecycle_stage = customer)
function useB44Clients() {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-customers-b44'],
    queryFn: () => base44.entities.Lead.filter({ lifecycle_stage: 'customer' }, '-updated_date'),
    initialData: [],
  });
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

  return useMemo(() => leads.map((lead) => {
    const leadInvoices = invoices.filter(i => i.lead_id === lead.id);
    const leadRecurring = recurring.filter(r => r.lead_id === lead.id && r.status === 'active');
    const mrr = leadRecurring.filter(r => r.frequency === 'monthly').reduce((a, r) => a + Number(r.amount || 0), 0);
    const totalBilled = leadInvoices.reduce((a, i) => a + Number(i.total_amount || 0), 0);
    const pendingAmount = leadInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((a, i) => a + Number(i.total_amount || 0), 0);
    return { ...lead, _source: 'b44', mrr, totalBilled, pendingAmount };
  }), [leads, invoices, recurring]);
}

export default function Clients() {
  const { data: supClients = [], isLoading: supLoading } = useClients();
  const b44Clients = useB44Clients();
  const [search, setSearch] = useState('');

  // Merge: prefer supabase, add b44 clients not present in supabase
  const supLeadIds = new Set(supClients.map(c => c.lead_id));
  const b44Only = b44Clients.filter(c => !supLeadIds.has(c.id));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const supFiltered = !q ? supClients : supClients.filter(c =>
      [c.name, c.company, c.email, c.contact_name].filter(Boolean).some(v => v.toLowerCase().includes(q))
    );
    const b44Filtered = !q ? b44Only : b44Only.filter(c =>
      [c.company, c.contact_name, c.name, c.email].filter(Boolean).some(v => v.toLowerCase().includes(q))
    );
    return { sup: supFiltered, b44: b44Filtered };
  }, [supClients, b44Only, search]);

  const totals = useMemo(() => {
    const supMrr = supClients.reduce((a, c) => a + (Number(c.mrr_amount) || 0), 0);
    const b44Mrr = b44Only.reduce((a, c) => a + (c.mrr || 0), 0);
    const supBilled = supClients.reduce((a, c) => a + (Number(c.lifetime_billed) || 0), 0);
    const b44Billed = b44Only.reduce((a, c) => a + (c.totalBilled || 0), 0);
    const supOutstanding = supClients.reduce((a, c) => a + (Number(c.outstanding_balance) || 0), 0);
    const b44Outstanding = b44Only.reduce((a, c) => a + (c.pendingAmount || 0), 0);
    return { mrr: supMrr + b44Mrr, billed: supBilled + b44Billed, outstanding: supOutstanding + b44Outstanding };
  }, [supClients, b44Only]);

  const isLoading = supLoading;
  const totalCount = (filtered.sup?.length || 0) + (filtered.b44?.length || 0);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Clients actius · {totalCount} registres</p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Kpi title="MRR" value={formatEuro(totals.mrr)} icon={TrendingUp} accent="emerald" />
        <Kpi title="Facturat històric" value={formatEuro(totals.billed)} icon={Users} accent="indigo" />
        <Kpi title="Pendent de cobrar" value={formatEuro(totals.outstanding)} icon={AlertCircle} accent={totals.outstanding > 0 ? 'red' : 'slate'} />
      </section>

      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per empresa, contacte o email" />
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading && <div className="p-8 text-center text-slate-400">Carregant...</div>}
        {!isLoading && totalCount === 0 && (
          <div className="p-8 text-center text-slate-400">
            Encara no hi ha clients. Converteix un lead en client des del seu detall.
          </div>
        )}
        {totalCount > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Contacte</th>
                <th className="text-right p-3">MRR</th>
                <th className="text-right p-3">Facturat</th>
                <th className="text-right p-3">Pendent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* Supabase clients */}
              {filtered.sup.map((c) => (
                <tr key={`sup-${c.lead_id}`} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{c.company || c.name || c.contact_name}</p>
                    <p className="text-xs text-slate-500">{c.city || c.zone || '-'}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-slate-800">{c.contact_name || '-'}</p>
                    <p className="text-xs text-slate-500">{c.email || c.phone || ''}</p>
                  </td>
                  <td className="p-3 text-right font-medium">{formatEuro(c.mrr_amount)}</td>
                  <td className="p-3 text-right">{formatEuro(c.lifetime_billed)}</td>
                  <td className={`p-3 text-right font-medium ${Number(c.outstanding_balance) > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {formatEuro(c.outstanding_balance)}
                  </td>
                  <td className="p-3 text-right">
                    <Link to={`/ClientDetail?id=${c.lead_id}`} className="text-xs text-blue-600 font-medium hover:underline">Obrir →</Link>
                  </td>
                </tr>
              ))}
              {/* Base44 entity clients */}
              {filtered.b44.map((c) => (
                <tr key={`b44-${c.id}`} className="border-t border-slate-100 hover:bg-slate-50/50 bg-emerald-50/30">
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{c.company || c.name || c.contact_name}</p>
                    <p className="text-xs text-emerald-600">📁 {c.project || 'Lead actiu'}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-slate-800">{c.contact_name || c.name || '-'}</p>
                    <p className="text-xs text-slate-500">{c.email || c.phone || ''}</p>
                  </td>
                  <td className="p-3 text-right font-medium text-emerald-700">{formatEuro(c.mrr)}</td>
                  <td className="p-3 text-right">{formatEuro(c.totalBilled)}</td>
                  <td className={`p-3 text-right font-medium ${c.pendingAmount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {formatEuro(c.pendingAmount)}
                  </td>
                  <td className="p-3 text-right">
                    <Link to={`/LeadDetail?id=${c.id}&tab=finance`} className="text-xs text-blue-600 font-medium hover:underline">Obrir →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Kpi({ title, value, icon: Icon, accent = 'slate' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase font-medium opacity-80">{title}</p>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}