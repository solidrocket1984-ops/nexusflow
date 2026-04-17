import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoices } from '@/lib/useFinanceData';
import { formatEuro, formatDate, INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from '@/lib/finance';

export default function Invoices() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const { data: invoices = [], isLoading } = useInvoices({ status });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [inv.number, inv.client_name, inv.lead_company, inv.lead_email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [invoices, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, inv) => {
        if (inv.status !== 'void') {
          acc.billed += Number(inv.total) || 0;
          acc.paid += Number(inv.amount_paid) || 0;
          acc.due += Number(inv.amount_due) || 0;
        }
        return acc;
      },
      { billed: 0, paid: 0, due: 0 }
    );
  }, [filtered]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Factures</h1>
        <p className="text-sm text-slate-500">{filtered.length} visibles · {formatEuro(totals.billed)} facturat · {formatEuro(totals.due)} pendent</p>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per número, client o email" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els estats</SelectItem>
              {Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading && <div className="p-8 text-center text-slate-400">Carregant...</div>}
        {!isLoading && filtered.length === 0 && <div className="p-8 text-center text-slate-400">No hi ha factures.</div>}
        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Número</th>
                <th className="text-left p-3">Emissió</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Tipus</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Pagat</th>
                <th className="text-right p-3">Pendent</th>
                <th className="p-3">Estat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{inv.number}</td>
                  <td className="p-3 text-slate-600">{formatDate(inv.issue_date)}</td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800">{inv.client_name || inv.lead_company}</p>
                    <p className="text-xs text-slate-500">{inv.lead_email || ''}</p>
                  </td>
                  <td className="p-3 text-slate-600 capitalize">{inv.kind}</td>
                  <td className="p-3 text-right">{formatEuro(inv.total)}</td>
                  <td className="p-3 text-right text-emerald-700">{formatEuro(inv.amount_paid)}</td>
                  <td className={`p-3 text-right ${Number(inv.amount_due) > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                    {formatEuro(inv.amount_due)}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${INVOICE_STATUS_STYLES[inv.status]}`}>
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link className="text-xs text-blue-600 font-medium" to={`/InvoiceDetail?id=${inv.id}`}>Obrir →</Link>
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
