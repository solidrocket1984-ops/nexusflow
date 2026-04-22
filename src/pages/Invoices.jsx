import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvoices } from '@/lib/useFinanceData';
import { formatEuro, formatDate, INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from '@/lib/finance';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const B44_STATUS_LABELS = { draft: 'Esborrany', sent: 'Enviada', paid: 'Pagada', overdue: 'Vençuda', cancelled: 'Cancel·lada' };
const B44_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
};

function useB44Invoices() {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-b44-full'],
    queryFn: () => base44.entities.Invoice.list('-issue_date', 200),
    initialData: [],
  });
  const { data: leads = [] } = useQuery({
    queryKey: ['leads-customers-b44'],
    queryFn: () => base44.entities.Lead.filter({ lifecycle_stage: 'customer' }, '-updated_date'),
    initialData: [],
  });
  const leadMap = useMemo(() => Object.fromEntries(leads.map(l => [l.id, l])), [leads]);
  return useMemo(() => invoices.map(inv => ({ ...inv, _lead: leadMap[inv.lead_id] })), [invoices, leadMap]);
}

export default function Invoices() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const { data: supInvoices = [], isLoading: supLoading } = useInvoices({ status });
  const b44Invoices = useB44Invoices();

  const filteredSup = useMemo(() => {
    if (source === 'b44') return [];
    const q = search.trim().toLowerCase();
    return supInvoices.filter(inv =>
      (!q || [inv.number, inv.client_name, inv.lead_company, inv.lead_email].filter(Boolean).some(v => v.toLowerCase().includes(q))) &&
      (status === 'all' || inv.status === status)
    );
  }, [supInvoices, search, status, source]);

  const filteredB44 = useMemo(() => {
    if (source === 'supabase') return [];
    const q = search.trim().toLowerCase();
    return b44Invoices.filter(inv => {
      const clientName = inv._lead?.company || inv._lead?.contact_name || inv._lead?.name || '';
      if (q && ![ inv.number, clientName, inv._lead?.email, inv.concept ].filter(Boolean).some(v => v.toLowerCase().includes(q))) return false;
      if (status !== 'all' && inv.status !== status) return false;
      return true;
    });
  }, [b44Invoices, search, status, source]);

  const totals = useMemo(() => {
    const supT = filteredSup.reduce((a, inv) => inv.status !== 'void' ? { billed: a.billed + (Number(inv.total) || 0), due: a.due + (Number(inv.amount_due) || 0) } : a, { billed: 0, due: 0 });
    const b44T = filteredB44.reduce((a, inv) => inv.status !== 'cancelled' ? { billed: a.billed + (Number(inv.total_amount) || 0), due: a.due + (inv.status !== 'paid' ? Number(inv.total_amount) || 0 : 0) } : a, { billed: 0, due: 0 });
    return { billed: supT.billed + b44T.billed, due: supT.due + b44T.due };
  }, [filteredSup, filteredB44]);

  const totalCount = filteredSup.length + filteredB44.length;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Factures</h1>
        <p className="text-sm text-slate-500">{totalCount} visibles · {formatEuro(totals.billed)} facturat · {formatEuro(totals.due)} pendent</p>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per número, client o concepte" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els estats</SelectItem>
              {Object.entries(B44_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {supLoading && <div className="p-8 text-center text-slate-400">Carregant...</div>}
        {!supLoading && totalCount === 0 && <div className="p-8 text-center text-slate-400">No hi ha factures.</div>}
        {totalCount > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Número</th>
                <th className="text-left p-3">Emissió</th>
                <th className="text-left p-3">Venciment</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Concepte</th>
                <th className="text-right p-3">Total</th>
                <th className="p-3">Estat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* Supabase invoices */}
              {filteredSup.map((inv) => (
                <tr key={`sup-${inv.id}`} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{inv.number}</td>
                  <td className="p-3 text-slate-600">{formatDate(inv.issue_date)}</td>
                  <td className="p-3 text-slate-600">{formatDate(inv.due_date) || '-'}</td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800">{inv.client_name || inv.lead_company}</p>
                  </td>
                  <td className="p-3 text-slate-600 truncate max-w-[160px]">{inv.kind || '-'}</td>
                  <td className="p-3 text-right">{formatEuro(inv.total)}</td>
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
              {/* Base44 invoices */}
              {filteredB44.map((inv) => {
                const today = new Date().toISOString().slice(0, 10);
                const isOverdue = inv.due_date && inv.due_date < today && inv.status !== 'paid';
                return (
                  <tr key={`b44-${inv.id}`} className="border-t border-slate-100 hover:bg-slate-50/50 bg-blue-50/20">
                    <td className="p-3 font-medium">{inv.number}</td>
                    <td className="p-3 text-slate-600">{inv.issue_date || '-'}</td>
                    <td className={`p-3 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>{inv.due_date || '-'}</td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{inv._lead?.company || inv._lead?.contact_name || inv._lead?.name || '-'}</p>
                      <p className="text-xs text-blue-500">Grup Living</p>
                    </td>
                    <td className="p-3 text-slate-600 truncate max-w-[160px]">{inv.concept || '-'}</td>
                    <td className="p-3 text-right">{formatEuro(inv.total_amount)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${B44_STATUS_STYLES[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                        {B44_STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link className="text-xs text-blue-600 font-medium" to={`/LeadDetail?id=${inv.lead_id}&tab=finance`}>Obrir →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}