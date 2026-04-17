import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYMENT_METHOD_LABELS, formatEuro } from '@/lib/finance';
import { useCreatePayment } from '@/lib/useFinanceData';

// props: { invoice, onClose }
export default function PaymentModal({ invoice, onClose }) {
  const create = useCreatePayment();
  const [error, setError] = useState(null);

  const outstanding = Number(invoice.amount_due ?? invoice.total - (invoice.amount_paid || 0)) || 0;

  const [form, setForm] = useState({
    amount: outstanding,
    method: 'transfer',
    paid_at: new Date().toISOString().slice(0, 16),
    reference: '',
    notes: '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setError(null);
    try {
      await create.mutateAsync({
        invoice_id: invoice.id,
        account_id: invoice.account_id,
        amount: Number(form.amount),
        method: form.method,
        paid_at: form.paid_at,
        reference: form.reference || null,
        notes: form.notes || null,
        currency: invoice.currency || 'EUR',
      });
      onClose?.();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Registrar pagament</h2>
            <p className="text-xs text-slate-500">Factura {invoice.number} · Pendent: <strong>{formatEuro(outstanding)}</strong></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
        </div>

        {error && <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Import (€)</p>
            <Input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Mètode</p>
            <Select value={form.method} onValueChange={(v) => set('method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Data i hora del pagament</p>
            <Input type="datetime-local" value={form.paid_at} onChange={(e) => set('paid_at', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Referència (opcional)</p>
            <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Nº transferència, id Stripe..." />
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Notes</p>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="md:col-span-2 flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={create.isPending}>Cancel·lar</Button>
            <Button className="flex-1" onClick={save} disabled={create.isPending || !form.amount}>
              {create.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Desant...</> : 'Registrar pagament'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
