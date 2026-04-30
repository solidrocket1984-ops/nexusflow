import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useClients } from '@/lib/useFinanceData';
import { formatEuro } from '@/lib/finance';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PROJECT_CATALOG, normalizeProjectId, getProjectName, getProjectColor } from '@/lib/projects';

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

  // b44 clients not already in supabase
  const supLeadIds = new Set(supClients.map(c => c.lead_id));
  const b44Only = b44Clients.filter(c => !supLeadIds.has(c.id));

  const allClients = useMemo(() => {
    const sup = supClients.map(c => ({ ...c, _source: 'sup', _normalizedProject: normalizeProjectId(c.project_id) }));
    const b44 = b44Only.map(c => ({ ...c, _normalizedProject: normalizeProjectId(c.project_id) }));
    return [...sup, ...b44];
  }, [supClients, b44Only]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allClients;
    return allClients.filter(c =>
      [c.company, c.name, c.contact_name, c.email].filter(Boolean).some(v => v.toLowerCase().includes(q))
    );
  }, [allClients, search]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map();
    PROJECT_CATALOG.forEach(p => map.set(p.id, []));
    filtered.forEach(c => {
      const key = c._normalizedProject;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    // Only return groups with clients
    return [...map.entries()].filter(([, clients]) => clients.length > 0);
  }, [filtered]);

  const totals = useMemo(() => {
    const mrr = allClients.reduce((a, c) => a + (Number(c.mrr_amount) || Number(c.mrr) || 0), 0);
    const billed = allClients.reduce((a, c) => a + (Number(c.lifetime_billed) || Number(c.totalBilled) || 0), 0);
    const outstanding = allClients.reduce((a, c) => a + (Number(c.outstanding_balance) || Number(c.pendingAmount) || 0), 0);
    return { mrr, billed, outstanding };
  }, [allClients]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-500">{allClients.length} clients actius</p>
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

      {supLoading && <div className="p-8 text-center text-slate-400">Carregant...</div>}
      {!supLoading && allClients.length === 0 && (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          Encara no hi ha clients. Converteix un lead en client des del seu detall.
        </div>
      )}

      {grouped.map(([projectKey, clients]) => {
        const color = getProjectColor(projectKey);
        const name = getProjectName(projectKey);
        return (
          <section key={projectKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <h2 className="text-sm font-semibold text-slate-700">{name}</h2>
              <span className="text-xs text-slate-400">· {clients.length} client{clients.length !== 1 ? 's' : ''}</span>
            </div>
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
                {clients.map((c) => {
                  const isB44 = c._source === 'b44';
                  const displayName = c.company || c.name || c.contact_name || '-';
                  const contactName = c.contact_name || (isB44 ? c.name : null) || '-';
                  const email = c.email || '';
                  const mrr = isB44 ? c.mrr : Number(c.mrr_amount) || 0;
                  const billed = isB44 ? c.totalBilled : Number(c.lifetime_billed) || 0;
                  const pending = isB44 ? c.pendingAmount : Number(c.outstanding_balance) || 0;
                  const href = isB44 ? `/LeadDetail?id=${c.id}&tab=finance` : `/ClientDetail?id=${c.lead_id}`;
                  return (
                    <tr key={`${c._source}-${c.id || c.lead_id}`} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3">
                        <p className="font-semibold text-slate-900">{displayName}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-slate-800">{contactName}</p>
                        <p className="text-xs text-slate-400">{email}</p>
                      </td>
                      <td className="p-3 text-right font-medium text-emerald-700">{formatEuro(mrr)}</td>
                      <td className="p-3 text-right">{formatEuro(billed)}</td>
                      <td className={`p-3 text-right font-medium ${pending > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                        {formatEuro(pending)}
                      </td>
                      <td className="p-3 text-right">
                        <Link to={href} className="text-xs text-blue-600 font-medium hover:underline">Obrir →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
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