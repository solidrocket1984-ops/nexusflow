import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { taskTypeOptions } from '@/lib/crmI18n';

export default function TaskEditorModal({ leads = [], initialTask = {}, onSave, onClose, title = 'Editar tasca' }) {
  const [form, setForm] = useState({
    title: initialTask.title || '',
    description: initialTask.description || '',
    lead_id: initialTask.lead_id || '',
    type: initialTask.type || 'seguimiento',
    priority: initialTask.priority || 'media',
    urgency: initialTask.urgency || 'media',
    due_date: initialTask.due_date || '',
    completed: !!initialTask.completed,
    completed_date: initialTask.completed_date || '',
    source: initialTask.source || 'manual',
    recurrence: initialTask.recurrence || 'none',
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Títol" value={form.title} onChange={(e) => update('title', e.target.value)} className="md:col-span-2" />
          <Input placeholder="Descripció" value={form.description} onChange={(e) => update('description', e.target.value)} className="md:col-span-2" />
          <Select value={form.lead_id || 'none'} onValueChange={(v) => update('lead_id', v === 'none' ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Lead vinculat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sense lead</SelectItem>
              {leads.map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.contact_name || lead.company || lead.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.type} onValueChange={(v) => update('type', v)}>
            <SelectTrigger><SelectValue placeholder="Tipus de tasca" /></SelectTrigger>
            <SelectContent>{taskTypeOptions.map(([v, l]) => <SelectItem value={v} key={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.priority} onValueChange={(v) => update('priority', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[['alta','Alta'],['media','Mitja'],['baja','Baixa']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={form.urgency} onValueChange={(v) => update('urgency', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[['alta','Alta'],['media','Mitja'],['baja','Baixa']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={form.due_date} onChange={(e) => update('due_date', e.target.value)} />
          <Select value={form.recurrence} onValueChange={(v) => update('recurrence', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[['none','Sense recurrència'],['daily','Diària'],['weekly','Setmanal'],['monthly','Mensual']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.completed} onChange={(e) => update('completed', e.target.checked)} />Completada</label>
          <Input type="date" value={form.completed_date} onChange={(e) => update('completed_date', e.target.value)} placeholder="Data completada" />
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel·lar</Button>
            <Button className="flex-1" onClick={() => onSave(form)} disabled={!form.title.trim()}>Desar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
