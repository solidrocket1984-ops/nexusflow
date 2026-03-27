import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EditLeadModal({ lead, onClose }) {
  const [form, setForm] = useState({
    company: lead.company || '',
    contact_name: lead.contact_name || lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || '',
    pipeline_status: lead.pipeline_status || 'nuevo',
    lead_status: lead.lead_status || 'active',
    lifecycle_stage: lead.lifecycle_stage || 'lead',
    temperature: lead.temperature || 'frio',
    priority: lead.priority || 'media',
    urgency: lead.urgency || 'media',
    next_action: lead.next_action || '',
    next_action_date: lead.next_action_date || '',
    current_result: lead.current_result || '',
    key_objection: lead.key_objection || '',
    recommended_response: lead.recommended_response || '',
    offer_angle: lead.offer_angle || '',
    annual_value: lead.annual_value || '',
    probability: lead.probability || '',
    notes: lead.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    await base44.entities.Lead.update(lead.id, {
      ...form,
      annual_value: form.annual_value ? Number(form.annual_value) : null,
      probability: form.probability ? Number(form.probability) : null,
      weighted_value: form.annual_value && form.probability ? Math.round(Number(form.annual_value) * Number(form.probability) / 100) : lead.weighted_value,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><h2 className="font-bold">Editar lead</h2><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Empresa" value={form.company} onChange={(e) => set('company', e.target.value)} />
          <Input placeholder="Contacte" value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
          <Input placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input placeholder="Telèfon" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input placeholder="Website" value={form.website} onChange={(e) => set('website', e.target.value)} />
          <Input placeholder="Owner" value={form.owner || ''} onChange={(e) => set('owner', e.target.value)} />

          <Select value={form.pipeline_status} onValueChange={(v) => set('pipeline_status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['nuevo','contactado','pendiente_respuesta','reunion_agendada','propuesta_enviada','negociacion','ganado','perdido'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={form.lead_status} onValueChange={(v) => set('lead_status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['active','won','lost','paused'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={form.lifecycle_stage} onValueChange={(v) => set('lifecycle_stage', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['lead','qualified','opportunity','customer','lost'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={form.temperature} onValueChange={(v) => set('temperature', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['frio','templado','caliente'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={form.priority} onValueChange={(v) => set('priority', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['alta','media','baja'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={form.urgency} onValueChange={(v) => set('urgency', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['alta','media','baja'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>

          <Input placeholder="Next action" value={form.next_action} onChange={(e) => set('next_action', e.target.value)} className="md:col-span-2" />
          <Input type="date" value={form.next_action_date} onChange={(e) => set('next_action_date', e.target.value)} />
          <Input placeholder="Current result" value={form.current_result} onChange={(e) => set('current_result', e.target.value)} />
          <Input placeholder="Key objection" value={form.key_objection} onChange={(e) => set('key_objection', e.target.value)} />
          <Input placeholder="Recommended response" value={form.recommended_response} onChange={(e) => set('recommended_response', e.target.value)} />
          <Input placeholder="Offer angle" value={form.offer_angle} onChange={(e) => set('offer_angle', e.target.value)} />
          <Input type="number" placeholder="Annual value" value={form.annual_value} onChange={(e) => set('annual_value', e.target.value)} />
          <Input type="number" placeholder="Probability %" value={form.probability} onChange={(e) => set('probability', e.target.value)} />
          <textarea className="md:col-span-2 w-full border rounded-md p-2 text-sm" rows={4} placeholder="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel·lar</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>{saving ? 'Desant...' : 'Desar canvis'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
