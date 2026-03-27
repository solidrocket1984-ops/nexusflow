import React from 'react';
import { Badge } from '@/components/ui/badge';
import { explainLeadScore, getLeadPriorityBucket } from '@/lib/crmUtils';
import { scoreBucketLabels } from '@/lib/crmI18n';

export default function ScoreExplanation({ lead, compact = false }) {
  const explanation = explainLeadScore(lead);
  const bucket = getLeadPriorityBucket(lead);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="secondary">Puntuació: {explanation.total}</Badge>
        <Badge className="bg-slate-800">{scoreBucketLabels[bucket]}</Badge>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Explicació de la puntuació</p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Total: {explanation.total}</Badge>
          <Badge className="bg-slate-800">{scoreBucketLabels[bucket]}</Badge>
        </div>
      </div>
      {explanation.breakdown.length === 0 ? (
        <p className="text-xs text-slate-500">No hi ha regles actives per a aquest lead.</p>
      ) : (
        <ul className="space-y-1">
          {explanation.breakdown.map((item) => (
            <li key={item.ruleId} className="flex items-center justify-between text-xs">
              <span className="text-slate-700">{item.label}</span>
              <span className="font-semibold text-slate-900">+{item.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
