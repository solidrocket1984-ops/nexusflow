import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function ProposalModal({ lead, onClose }) {
  const [proposal, setProposal] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    const prompt = `Genera proposta comercial en JSON (title, summary, problem, proposed_solution, offer_angle) per ${lead.contact_name || lead.name || lead.company}. Dolor: ${lead.key_objection || lead.pain_point || 'N/A'}.`;
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

    await base44.entities.Proposal.create({
      lead_id: lead.id,
      project_id: lead.project_id,
      ...res,
      setup_fee: lead.setup_fee,
      monthly_fee: lead.monthly_fee,
      annual_value: lead.annual_value,
      status: 'draft',
      version: 1,
    });

    await base44.entities.Activity.create({
      lead_id: lead.id,
      project_id: lead.project_id || 'enlac_digital',
      type: 'propuesta',
      description: `Proposta generada: ${res.title}`,
      date: new Date().toISOString(),
    });

    setProposal(res);
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><h2 className="font-bold">Nova proposta</h2><button onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="p-4 space-y-3">
          {!proposal ? <Button className="w-full" onClick={generate} disabled={generating}>{generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generant...</> : 'Generar proposta i guardar draft'}</Button> : (
            <div className="space-y-2">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm font-semibold">{proposal.title}</p>
                <p className="text-xs text-slate-600 mt-1">{proposal.summary}</p>
              </div>
              <Button className="w-full" onClick={onClose}>Tancar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}