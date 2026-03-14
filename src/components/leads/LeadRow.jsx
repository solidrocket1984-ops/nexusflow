import React from 'react';
import { PipelineBadge, TemperatureBadge, PriorityBadge } from '../shared/PipelineBadge';
import { Phone, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function LeadRow({ lead, projects }) {
  const project = projects.find(p => p.id === lead.project_id);

  return (
    <div className="p-4 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-slate-900 text-sm">{lead.name}</h4>
            {lead.company && <span className="text-xs text-slate-400">· {lead.company}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <PipelineBadge status={lead.pipeline_status} />
            <TemperatureBadge temperature={lead.temperature} />
            <PriorityBadge priority={lead.priority} />
            {project && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                {project.name}
              </span>
            )}
          </div>
          {lead.next_action && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{lead.next_action}</span>
              {lead.next_action_date && (
                <span className="text-slate-400">· {format(new Date(lead.next_action_date), "d MMM", { locale: es })}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
              <Phone className="w-3.5 h-3.5 text-slate-600" />
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
              <Mail className="w-3.5 h-3.5 text-slate-600" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}