import React, { useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LogActivityModal({ lead, onClose }) {
  const [form, setForm] = useState({ type: 'call', subject: '', summary: '', outcome: '', next_action: '', next_action_date: '', create_followup_task: false });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.Activity.create({
      lead_id: lead.id,
      type: form.type,
      subject: form.subject,
      summary: form.summary,
      outcome: form.outcome,
      activity_date: new Date().toISOString(),
      next_action: form.next_action || null,
      next_action_date: form.next_action_date || null,
      created_manually: true,
      auto_generated: false,
    });

    const updates = { last_activity_date: today, last_contact: today };
    if (form.type === 'call') updates.last_call_date = today;
    if (form.type === 'email') updates.last_email_date = today;
    if (form.next_action) updates.next_action = form.next_action;
    if (form.next_action_date) updates.next_action_date = form.next_action_date;
    await base44.entities.Lead.update(lead.id, updates);

    if (form.create_followup_task && form.next_action) {
      await base44.entities.Task.create({
        title: `Follow-up: ${form.next_action}`,
        lead_id: lead.id,
        project_id: lead.project_id,
        due_date: form.next_action_date || today,
        type: 'seguimiento',
        priority: 'media',
        source: 'manual',
        completed: false,
      });
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold">Registrar activitat</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Trucada</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="meeting">Reunió</SelectItem>
              <SelectItem value="note">Nota</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Assumpte" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
          <textarea className="w-full border rounded-md p-2 text-sm" rows={3} placeholder="Resum" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
          <Input placeholder="Resultat" value={form.outcome} onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))} />
          <Input placeholder="Pròxim pas" value={form.next_action} onChange={(e) => setForm((p) => ({ ...p, next_action: e.target.value }))} />
          <Input type="date" value={form.next_action_date} onChange={(e) => setForm((p) => ({ ...p, next_action_date: e.target.value }))} />
          <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={form.create_followup_task} onChange={(e) => setForm((p) => ({ ...p, create_followup_task: e.target.checked }))} /> Crear tasca de follow-up</label>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel·lar</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>{saving ? 'Desant...' : 'Desar activitat'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
