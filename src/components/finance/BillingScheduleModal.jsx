import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BILLING_FREQUENCY_LABELS } from '@/lib/finance';
import { useUpsertBillingSchedule } from '@/lib/useFinanceData';

// props: { schedule?, lead, contract, onClose }
export default function BillingScheduleModal({ schedule, lead, contract, onClose }) {
  const upsert = useUpsertBillingSchedule();
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    description: schedule?.description || 'Quota mensual de manteniment',
    amount: schedule?.amount || contract?.monthly_fee || 0,
    tax_rate: schedule?.tax_rate ?? 21,
    currency: schedule?.currency || 'EUR',
    frequency: schedule?.frequency || 'monthly',
    billing_day: schedule?.billing_day ?? contract?.billing_day ?? 1,
    start_date: schedule?.start_date || new Date().toISOString().slice(0, 10),
    end_date: schedule?.end_date || '',
    next_run_date: schedule?.next_run_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    is_active: schedule?.is_active ?? true,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setError(null);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        tax_rate: Number(form.tax_rate),
        billing_day: Number(form.billing_day),
        end_date: form.end_date || null,
      };
      if (schedule?.id) {
        await upsert.mutateAsync({ id: schedule.id, ...payload });
      } else {
        await upsert.mutateAsync({
          ...payload,
          account_id: lead.account_id,
          contract_id: contract.id,
          lead_id: lead.id,
        });
      }
      onClose?.();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">
            {schedule?.id ? 'Editar pla de cobrament' : 'Nou pla de cobrament recurrent'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
        </div>

        {error && <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Descripció</p>
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Import (€)</p>
            <Input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">IVA %</p>
            <Input type="number" value={form.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Freqüència</p>
            <Select value={form.frequency} onValueChange={(v) => set('frequency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BILLING_FREQUENCY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Dia del mes</p>
            <Input type="number" min={1} max={28} value={form.billing_day} onChange={(e) => set('billing_day', e.target.value)} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Data d'inici</p>
            <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Pròxim cobrament</p>
            <Input type="date" value={form.next_run_date} onChange={(e) => set('next_run_date', e.target.value)} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Data de fi (opcional)</p>
            <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            Actiu
          </label>

          <div className="md:col-span-2 flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={upsert.isPending}>Cancel·lar</Button>
            <Button className="flex-1" onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Desant...</> : 'Desar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
