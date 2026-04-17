import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useClients } from '@/lib/useFinanceData';
import { formatEuro } from '@/lib/finance';

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.company, c.email, c.contact_name].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [clients, search]);

  const totals = useMemo(() => {
    return clients.reduce(
      (acc, c) => {
        acc.mrr += Number(c.mrr_amount) || 0;
        acc.billed += Number(c.lifetime_billed) || 0;
        acc.outstanding += Number(c.outstanding_balance) || 0;
        return acc;
      },
      { mrr: 0, billed: 0, outstanding: 0 }
    );
  }, [clients]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Leads amb cicle vital = customer · {clients.length} actius</p>
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
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            Encara no hi ha clients. Converteix un lead en client des del seu detall.
          </div>
        )}
        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Contacte</th>
                <th className="text-right p-3">Contractes</th>
                <th className="text-right p-3">MRR</th>
                <th className="text-right p-3">Facturat</th>
                <th className="text-right p-3">Pendent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.lead_id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3">
                    <p className="font-semibold text-slate-900">{c.company || c.name || c.contact_name}</p>
                    <p className="text-xs text-slate-500">{c.city || c.zone || '-'}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-slate-800">{c.contact_name || '-'}</p>
                    <p className="text-xs text-slate-500">{c.email || c.phone || ''}</p>
                  </td>
                  <td className="p-3 text-right">{c.active_contracts || 0}</td>
                  <td className="p-3 text-right font-medium">{formatEuro(c.mrr_amount)}</td>
                  <td className="p-3 text-right">{formatEuro(c.lifetime_billed)}</td>
                  <td className={`p-3 text-right font-medium ${Number(c.outstanding_balance) > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {formatEuro(c.outstanding_balance)}
                  </td>
                  <td className="p-3 text-right">
                    <Link to={`/ClientDetail?id=${c.lead_id}`} className="text-xs text-blue-600 font-medium hover:underline">
                      Obrir →
                    </Link>
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
