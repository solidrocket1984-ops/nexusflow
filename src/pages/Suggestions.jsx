import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, CheckCircle, X } from 'lucide-react';
import { useLeads } from '../components/shared/useAppData';
import { generateSuggestionsFromLeads } from '../lib/crmUtils';

export default function Suggestions() {
  const { data: leads = [] } = useLeads();
  const [hidden, setHidden] = useState({});

  const suggestions = generateSuggestionsFromLeads(leads).filter((s) => !hidden[s.id]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Suggestions CRM</h1>
        <p className="text-sm text-slate-500">Accions derivades de l'estat real de Leads, Tasques i Propostes.</p>
      </header>

      <section className="space-y-2">
        {suggestions.length === 0 && <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">Tot al dia 👌</div>}
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center"><Lightbulb className="w-4 h-4 text-indigo-600" /></div>
            <div className="flex-1 min-w-0">
              <Link to={`/LeadDetail?id=${suggestion.lead_id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600">{suggestion.lead?.contact_name || suggestion.lead?.name || suggestion.lead?.company}</Link>
              <p className="text-xs text-slate-600 mt-1">{suggestion.reason}</p>
              <div className="flex gap-2 mt-2">
                <Link to={`/LeadDetail?id=${suggestion.lead_id}`} className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">{suggestion.cta}</Link>
                <button onClick={() => setHidden((p) => ({ ...p, [suggestion.id]: true }))} className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"><X className="w-3 h-3 inline mr-1" />Descartar</button>
                <span className={`text-[10px] px-2 py-1 rounded-full ${suggestion.priority === 'alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{suggestion.priority}</span>
                <span className="text-[10px] text-slate-400">score {suggestion.score}</span>
              </div>
            </div>
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-1" />
          </div>
        ))}
      </section>
    </div>
  );
}
