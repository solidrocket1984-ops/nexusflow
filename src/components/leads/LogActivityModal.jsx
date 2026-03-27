import React, { useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LogActivityModal({ lead, onClose, activity }) {
  const [form, setForm] = useState({
    type: activity?.type || 'call',
    subject: activity?.subject || '',
    summary: activity?.summary || '',
    outcome: activity?.outcome || '',
    activity_date: activity?.activity_date?.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'),
    next_action: activity?.next_action || '',
    next_action_date: activity?.next_action_date || '',
    created_manually: activity?.created_manually ?? true,
    auto_generated: activity?.auto_generated ?? false,
    syncLeadNextAction: false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.subject.trim()) return;
    setSaving(true);
    const payload = {
      lead_id: lead.id,
      type: form.type,
      subject: form.subject,
      summary: form.summary,
      outcome: form.outcome,
      activity_date: new Date(form.activity_date).toISOString(),
      next_action: form.next_action || null,
      next_action_date: form.next_action_date || null,
      created_manually: form.created_manually,
      auto_generated: form.auto_generated,
    };

    if (activity?.id) await base44.entities.Activity.update(activity.id, payload);
    else await base44.entities.Activity.create(payload);

    const updates = { last_activity_date: form.activity_date, last_contact: form.activity_date };
    if (form.type === 'call') updates.last_call_date = form.activity_date;
    if (form.type === 'email') updates.last_email_date = form.activity_date;
    if (form.syncLeadNextAction) {
      updates.next_action = form.next_action || lead.next_action || null;
      updates.next_action_date = form.next_action_date || lead.next_action_date || null;
    }
    await base44.entities.Lead.update(lead.id, updates);

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold">{activity ? 'Editar activitat' : 'Registrar activitat'}</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Trucada</SelectItem>
              <SelectItem value="email">Correu</SelectItem>
              <SelectItem value="visit">Visita</SelectItem>
              <SelectItem value="meeting">Reunió</SelectItem>
              <SelectItem value="note">Nota</SelectItem>
              <SelectItem value="seguimiento">Seguiment</SelectItem>
              <SelectItem value="proposal">Proposta</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={form.activity_date} onChange={(e) => setForm((p) => ({ ...p, activity_date: e.target.value }))} />
          <Input placeholder="Assumpte" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="md:col-span-2" />
          <textarea className="w-full border rounded-md p-2 text-sm md:col-span-2" rows={3} placeholder="Resum" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
          <Input placeholder="Resultat" value={form.outcome} onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))} />
          <Input placeholder="Acció següent" value={form.next_action} onChange={(e) => setForm((p) => ({ ...p, next_action: e.target.value }))} />
          <Input type="date" value={form.next_action_date} onChange={(e) => setForm((p) => ({ ...p, next_action_date: e.target.value }))} />
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={form.created_manually} onChange={(e) => setForm((p) => ({ ...p, created_manually: e.target.checked }))} />Creat manualment</label>
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={form.auto_generated} onChange={(e) => setForm((p) => ({ ...p, auto_generated: e.target.checked }))} />Automàtica</label>
          <label className="md:col-span-2 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={form.syncLeadNextAction} onChange={(e) => setForm((p) => ({ ...p, syncLeadNextAction: e.target.checked }))} />Actualitzar acció següent del lead amb aquestes dades</label>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel·lar</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>{saving ? 'Desant...' : 'Desar activitat'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
