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
    phone: lead.phone || '',
    email: lead.email || '',
    website: lead.website || '',
    channel: lead.channel || '',
    origin: lead.origin || '',
    pipeline_status: lead.pipeline_status || 'nuevo',
    lead_status: lead.lead_status || 'active',
    lifecycle_stage: lead.lifecycle_stage || 'lead',
    temperature: lead.temperature || 'frio',
    priority: lead.priority || 'media',
    urgency: lead.urgency || 'media',
    owner: lead.owner || '',
    notes: lead.notes || '',
    current_result: lead.current_result || '',
    key_objection: lead.key_objection || '',
    recommended_response: lead.recommended_response || '',
    offer_angle: lead.offer_angle || '',
    probability: lead.probability || '',
    weighted_value: lead.weighted_value || '',
    annual_value: lead.annual_value || '',
    proposal_status: lead.proposal_status || 'none',
    email_status: lead.email_status || 'none',
    next_action: lead.next_action || '',
    next_action_date: lead.next_action_date || '',
    last_call_date: lead.last_call_date || '',
    last_email_date: lead.last_email_date || '',
    last_contact: lead.last_contact || '',
    demo_date: lead.demo_date || '',
    proposal_date: lead.proposal_date || '',
    closing_date: lead.closing_date || '',
    is_archived: !!lead.is_archived,
    archive_reason: lead.archive_reason || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.contact_name.trim() && !form.company.trim()) {
      window.alert('Cal indicar com a mínim nom del contacte o empresa.');
      return;
    }
    setSaving(true);
    const annual = Number(form.annual_value || 0);
    const probability = Number(form.probability || 0);
    await base44.entities.Lead.update(lead.id, {
      ...form,
      annual_value: form.annual_value ? annual : null,
      probability: form.probability ? probability : null,
      weighted_value: form.weighted_value ? Number(form.weighted_value) : Math.round(annual * probability / 100),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><h2 className="font-bold">Editar lead (edició completa)</h2><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Nom del contacte / decisor" value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
          <Input placeholder="Empresa" value={form.company} onChange={(e) => set('company', e.target.value)} />
          <Input placeholder="Responsable" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
          <Input placeholder="Telèfon" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Input placeholder="Correu" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input placeholder="Web" value={form.website} onChange={(e) => set('website', e.target.value)} />
          <Input placeholder="Canal" value={form.channel} onChange={(e) => set('channel', e.target.value)} />
          <Input placeholder="Origen" value={form.origin} onChange={(e) => set('origin', e.target.value)} />
          <Input placeholder="Resultat actual" value={form.current_result} onChange={(e) => set('current_result', e.target.value)} />

          <Select value={form.pipeline_status} onValueChange={(v) => set('pipeline_status', v)}><SelectTrigger><SelectValue placeholder="Etapa del pipeline" /></SelectTrigger><SelectContent>{[['nuevo','Nou'],['contactado','Contactat'],['pendiente_respuesta','Pendent resposta'],['reunion_agendada','Reunió agendada'],['propuesta_enviada','Proposta enviada'],['negociacion','Negociació'],['ganado','Guanyat'],['perdido','Perdut']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={form.lead_status} onValueChange={(v) => set('lead_status', v)}><SelectTrigger><SelectValue placeholder="Estat del lead" /></SelectTrigger><SelectContent>{[['active','En seguiment'],['won','Guanyat'],['lost','Perdut'],['paused','Pausat']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={form.lifecycle_stage} onValueChange={(v) => set('lifecycle_stage', v)}><SelectTrigger><SelectValue placeholder="Etapa de vida" /></SelectTrigger><SelectContent>{[['lead','Lead'],['qualified','Qualificat'],['opportunity','Oportunitat'],['customer','Client'],['lost','Perdut']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={form.temperature} onValueChange={(v) => set('temperature', v)}><SelectTrigger><SelectValue placeholder="Temperatura" /></SelectTrigger><SelectContent>{[['frio','Fred'],['templado','Temperat'],['caliente','Calent']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={form.priority} onValueChange={(v) => set('priority', v)}><SelectTrigger><SelectValue placeholder="Prioritat" /></SelectTrigger><SelectContent>{[['alta','Alta'],['media','Mitja'],['baja','Baixa']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={form.urgency} onValueChange={(v) => set('urgency', v)}><SelectTrigger><SelectValue placeholder="Urgència" /></SelectTrigger><SelectContent>{[['alta','Alta'],['media','Mitja'],['baja','Baixa']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>

          <Input placeholder="Acció següent" value={form.next_action} onChange={(e) => set('next_action', e.target.value)} className="md:col-span-2" />
          <Input type="date" value={form.next_action_date} onChange={(e) => set('next_action_date', e.target.value)} />
          <Input placeholder="Objecció clau" value={form.key_objection} onChange={(e) => set('key_objection', e.target.value)} className="md:col-span-2" />
          <Input placeholder="Resposta recomanada" value={form.recommended_response} onChange={(e) => set('recommended_response', e.target.value)} />
          <Input placeholder="Oferta / angle" value={form.offer_angle} onChange={(e) => set('offer_angle', e.target.value)} />

          <Input type="number" placeholder="Probabilitat" value={form.probability} onChange={(e) => set('probability', e.target.value)} />
          <Input type="number" placeholder="Valor ponderat" value={form.weighted_value} onChange={(e) => set('weighted_value', e.target.value)} />
          <Input type="number" placeholder="Valor anual" value={form.annual_value} onChange={(e) => set('annual_value', e.target.value)} />

          <Select value={form.proposal_status} onValueChange={(v) => set('proposal_status', v)}><SelectTrigger><SelectValue placeholder="Estat de proposta" /></SelectTrigger><SelectContent>{[['none','Cap'],['draft','Esborrany'],['sent','Enviada'],['accepted','Acceptada'],['rejected','Rebutjada']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={form.email_status} onValueChange={(v) => set('email_status', v)}><SelectTrigger><SelectValue placeholder="Estat de correu" /></SelectTrigger><SelectContent>{[['none','Cap'],['draft','Esborrany'],['sent','Enviat'],['opened','Obert'],['replied','Respost']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={form.is_archived} onChange={(e) => set('is_archived', e.target.checked)} />Arxivat</label>

          <Input type="date" value={form.last_call_date} onChange={(e) => set('last_call_date', e.target.value)} placeholder="Última trucada" />
          <Input type="date" value={form.last_email_date} onChange={(e) => set('last_email_date', e.target.value)} placeholder="Últim correu" />
          <Input type="date" value={form.last_contact} onChange={(e) => set('last_contact', e.target.value)} placeholder="Últim contacte" />
          <Input type="date" value={form.demo_date} onChange={(e) => set('demo_date', e.target.value)} placeholder="Data demo" />
          <Input type="date" value={form.proposal_date} onChange={(e) => set('proposal_date', e.target.value)} placeholder="Data proposta" />
          <Input type="date" value={form.closing_date} onChange={(e) => set('closing_date', e.target.value)} placeholder="Data tancament" />

          <Input placeholder="Motiu d’arxiu" value={form.archive_reason} onChange={(e) => set('archive_reason', e.target.value)} className="md:col-span-3" />
          <textarea className="md:col-span-3 w-full border rounded-md p-2 text-sm" rows={4} placeholder="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          <div className="md:col-span-3 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel·lar</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>{saving ? 'Desant...' : 'Desar canvis'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
