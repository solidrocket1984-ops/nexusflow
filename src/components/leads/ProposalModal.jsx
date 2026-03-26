import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ProposalModal({ lead, project, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState(null);

  const generate = async () => {
    setGenerating(true);
    const prompt = `Genera una proposta comercial estructurada en català per a un lead CRM.

Dades:
- Empresa/Lead: ${lead.name || lead.company}
- Dolor detectat / Pain point: ${lead.pain_point || lead.key_objection || 'No especificat'}
- Resultat actual del client: ${lead.current_result || ''}
- Angle d'oferta: ${lead.offer_angle || ''}
- Resposta recomanada: ${lead.recommended_response || ''}
- Setup fee: ${lead.setup_fee || 'a definir'} €
- Quota mensual: ${lead.monthly_fee || 'a definir'} €/mes
- Valor anual estimat: ${lead.annual_value || ''} €
- Projecte: ${project?.name || ''}
- Notes: ${lead.notes || ''}

Retorna un JSON amb:
- title: títol de la proposta
- summary: resum executiu (màxim 80 paraules)
- problem: dolor detectat (concís)
- proposed_solution: solució proposada (concís, orientada a resultats)
- offer_angle: angle de venda diferenciador

Sigues concís i orientat al valor, no genèric.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          problem: { type: 'string' },
          proposed_solution: { type: 'string' },
          offer_angle: { type: 'string' },
        },
      },
    });

    const saved = await base44.entities.Proposal.create({
      lead_id: lead.id,
      project_id: lead.project_id,
      title: res.title,
      summary: res.summary,
      problem: res.problem,
      proposed_solution: res.proposed_solution,
      offer_angle: res.offer_angle,
      setup_fee: lead.setup_fee,
      monthly_fee: lead.monthly_fee,
      annual_value: lead.annual_value,
      status: 'draft',
      version: 1,
    });

    setProposal({ ...res, setup_fee: lead.setup_fee, monthly_fee: lead.monthly_fee, annual_value: lead.annual_value });
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-slate-900">Generar proposta</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!proposal ? (
            <>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
                <p><strong>Lead:</strong> {lead.name || lead.company}</p>
                {lead.setup_fee && <p><strong>Setup:</strong> €{lead.setup_fee}</p>}
                {lead.monthly_fee && <p><strong>Mensual:</strong> €{lead.monthly_fee}/mes</p>}
                {lead.annual_value && <p><strong>Valor anual:</strong> €{lead.annual_value}</p>}
              </div>
              <Button onClick={generate} disabled={generating} className="w-full">
                {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generant...</> : 'Generar proposta amb IA'}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Títol</p>
                  <p className="text-sm font-bold text-slate-900">{proposal.title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Resum executiu</p>
                  <p className="text-sm text-slate-700">{proposal.summary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Dolor detectat</p>
                  <p className="text-sm text-slate-700">{proposal.problem}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Solució proposada</p>
                  <p className="text-sm text-slate-700">{proposal.proposed_solution}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Angle de venda</p>
                  <p className="text-sm text-slate-700">{proposal.offer_angle}</p>
                </div>
                {(proposal.setup_fee || proposal.monthly_fee || proposal.annual_value) && (
                  <div className="flex gap-4 pt-2 border-t border-slate-200">
                    {proposal.setup_fee && <div><p className="text-[10px] text-slate-400">Setup</p><p className="text-sm font-bold">€{proposal.setup_fee}</p></div>}
                    {proposal.monthly_fee && <div><p className="text-[10px] text-slate-400">Mensual</p><p className="text-sm font-bold">€{proposal.monthly_fee}</p></div>}
                    {proposal.annual_value && <div><p className="text-[10px] text-slate-400">Anual</p><p className="text-sm font-bold">€{proposal.annual_value}</p></div>}
                  </div>
                )}
              </div>
              <Button onClick={onClose} className="w-full">Tancar i desar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}