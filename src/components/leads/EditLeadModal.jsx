import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function EditLeadModal({ lead, onClose }) {
  const [form, setForm] = useState({
    pipeline_status: lead.pipeline_status || 'nuevo',
    temperature: lead.temperature || 'frio',
    priority: lead.priority || 'media',
    next_action: lead.next_action || '',
    next_action_date: lead.next_action_date || '',
    notes: lead.notes || '',
    probability: lead.probability || '',
    monthly_fee: lead.monthly_fee || '',
    setup_fee: lead.setup_fee || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    await base44.entities.Lead.update(lead.id, {
      ...form,
      probability: form.probability ? Number(form.probability) : null,
      monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
      setup_fee: form.setup_fee ? Number(form.setup_fee) : null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-slate-900">Editar lead</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Estat pipeline</label>
            <Select value={form.pipeline_status} onValueChange={v => set('pipeline_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['nuevo','contactado','pendiente_respuesta','reunion_agendada','propuesta_enviada','negociacion','ganado','perdido'].map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Temperatura</label>
              <Select value={form.temperature} onValueChange={v => set('temperature', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frio">❄️ Fred</SelectItem>
                  <SelectItem value="templado">🌤 Temperat</SelectItem>
                  <SelectItem value="caliente">🔥 Calent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Prioritat</label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Mitja</SelectItem>
                  <SelectItem value="baja">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Pròxima acció</label>
            <Input value={form.next_action} onChange={e => set('next_action', e.target.value)} placeholder="Descripció de la pròxima acció" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Data pròxima acció</label>
            <Input type="date" value={form.next_action_date} onChange={e => set('next_action_date', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Prob. %</label>
              <Input type="number" value={form.probability} onChange={e => set('probability', e.target.value)} placeholder="0-100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Setup €</label>
              <Input type="number" value={form.setup_fee} onChange={e => set('setup_fee', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Mensual €</label>
              <Input type="number" value={form.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-sm">Cancel·lar</Button>
            <Button onClick={save} disabled={saving} className="flex-1 text-sm">
              {saving ? 'Desant...' : 'Desar canvis'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}