import React, { useState } from 'react';
import { format } from 'date-fns';
import { Copy, Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TEMPLATES = [
  ['cold_outreach', 'Captació en fred'],
  ['follow_up', 'Seguiment'],
  ['reactivation', 'Reactivació'],
  ['proposal_followup', 'Seguiment de proposta'],
  ['meeting_confirmation', 'Confirmació reunió'],
  ['post_call', 'Resum post-trucada'],
  ['custom', 'Personalitzat'],
];

export default function EmailDraftModal({ lead, onClose }) {
  const [template, setTemplate] = useState('follow_up');
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    const prompt = `Genera un email comercial curt i accionable. Tipus: ${template}.\nLead: ${lead.contact_name || lead.name || lead.company}.\nEstat: ${lead.pipeline_status}.\nObjecció: ${lead.key_objection || 'cap'}.\nNext action: ${lead.next_action || 'no definit'}.\nResposta en JSON {subject, body}.`;
    const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } } } });
    await base44.entities.EmailDraft.create({
      lead_id: lead.id,
      project_id: lead.project_id,
      subject: res.subject,
      body: res.body,
      tone: 'professional',
      objective: template,
      status: 'draft',
      template_type: template,
      generated_date: format(new Date(), 'yyyy-MM-dd'),
    });
    await base44.entities.Activity.create({ lead_id: lead.id, type: 'email_draft', subject: `Draft generat (${template})`, summary: res.subject, activity_date: new Date().toISOString(), auto_generated: true });
    setDraft(res);
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><h2 className="font-bold">Esborrany de correu</h2><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="p-4 space-y-3">
          <Select value={template} onValueChange={setTemplate}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEMPLATES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
          {!draft ? <Button className="w-full" onClick={generate} disabled={generating}>{generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generant...</> : 'Generar i guardar esborrany'}</Button> : (
            <div className="space-y-2">
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Assumpte</p><p className="text-sm font-semibold">{draft.subject}</p><p className="text-xs text-slate-500 mt-2">Cos</p><p className="text-sm whitespace-pre-wrap">{draft.body}</p></div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)}><Copy className="w-4 h-4 mr-1" />Copiar</Button>
                <Button variant="outline" onClick={generate} disabled={generating}>Regenerar</Button>
                <Button onClick={onClose}>Tancar</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
