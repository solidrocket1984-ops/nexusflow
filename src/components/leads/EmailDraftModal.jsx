import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Copy, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const TEMPLATES = [
  { value: 'follow_up', label: 'Seguiment' },
  { value: 'cold_outreach', label: 'Primer contacte' },
  { value: 'reactivation', label: 'Reactivació' },
  { value: 'proposal_followup', label: 'Follow-up proposta' },
  { value: 'meeting_confirmation', label: 'Confirmació reunió' },
  { value: 'post_call', label: 'Resum post-trucada' },
  { value: 'custom', label: 'Personalitzat' },
];

export default function EmailDraftModal({ lead, project, onClose }) {
  const [template, setTemplate] = useState('follow_up');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setGenerating(true);
    const label = TEMPLATES.find(t => t.value === template)?.label || template;
    const prompt = `Genera un email comercial professional en català (o castellà si el context ho indica) del tipus "${label}" per a un lead CRM.

Dades del lead:
- Nom/Empresa: ${lead.name || lead.company}
- Resultat actual: ${lead.current_result || 'No definit'}
- Objecció clau: ${lead.key_objection || 'Cap especificada'}
- Resposta recomanada: ${lead.recommended_response || 'No definida'}
- Angle d'oferta: ${lead.offer_angle || lead.pain_point || 'No definit'}
- Notes: ${lead.notes || ''}
- Projecte: ${project?.name || ''}
- Estat pipeline: ${lead.pipeline_status || ''}
- Temperatura: ${lead.temperature || ''}

Retorna un JSON amb:
- subject: l'assumpte de l'email
- body: el cos de l'email (sense salutació genèrica, directe i concis, màxim 150 paraules)

Sigues directe, professional i orientat a l'acció. Evita frases genèriques.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' },
        },
      },
    });

    await base44.entities.EmailDraft.create({
      lead_id: lead.id,
      project_id: lead.project_id,
      subject: res.subject,
      body: res.body,
      template_type: template,
      status: 'draft',
      generated_date: format(new Date(), 'yyyy-MM-dd'),
    });

    setDraft(res);
    setGenerating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Generar email</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Tipus d'email</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!draft ? (
            <Button onClick={generate} disabled={generating} className="w-full">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generant...</> : 'Generar email amb IA'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Assumpte</p>
                  <p className="text-sm font-medium text-slate-900">{draft.subject}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Cos</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{draft.body}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={copy} variant="outline" className="flex-1 text-sm">
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> {copied ? 'Copiat!' : 'Copiar'}
                </Button>
                <Button onClick={generate} variant="outline" disabled={generating} className="text-sm">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Regenerar'}
                </Button>
                <Button onClick={onClose} className="text-sm">Tancar</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}