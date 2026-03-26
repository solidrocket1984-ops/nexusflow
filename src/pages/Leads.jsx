import React, { useState } from 'react';
import { useLeads, useProjects } from '../components/shared/useAppData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Flame, AlertTriangle, Edit, Mail, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { pipelineLabels, pipelineColors, temperatureColors, priorityColors, isOverdue, isHot, scoreLead, isActiveInPipeline } from '../lib/crmUtils';

const QUICK_FILTERS = [
  { key: 'all', label: 'Tots' },
  { key: 'overdue', label: '⚠️ Vençuts' },
  { key: 'hot', label: '🔥 Calents' },
  { key: 'alta', label: '🔴 Alta prioritat' },
  { key: 'inactive', label: '💤 Inactius +14d' },
  { key: 'proposal', label: '📄 Proposta enviada' },
];

export default function Leads() {
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const filtered = leads
    .filter(l => !l.is_archived || showArchived)
    .filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !search || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
      const matchProject = projectFilter === 'all' || l.project_id === projectFilter;
      const matchStatus = statusFilter === 'all' || l.pipeline_status === statusFilter;
      let matchQuick = true;
      if (quickFilter === 'overdue') matchQuick = isOverdue(l);
      if (quickFilter === 'hot') matchQuick = isHot(l);
      if (quickFilter === 'alta') matchQuick = l.priority === 'alta';
      if (quickFilter === 'inactive') matchQuick = (l.days_without_activity || 0) >= 14;
      if (quickFilter === 'proposal') matchQuick = l.proposal_status === 'sent' || l.pipeline_status === 'propuesta_enviada';
      return matchSearch && matchProject && matchStatus && matchQuick;
    })
    .sort((a, b) => scoreLead(b) - scoreLead(a));

  const active = leads.filter(l => isActiveInPipeline(l)).length;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500 mt-1">{active} actius · {leads.length} total</p>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        {QUICK_FILTERS.map(f => (
          <button key={f.key} onClick={() => setQuickFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              quickFilter === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar per nom, empresa o email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Projecte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els projectes</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Estat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els estats</SelectItem>
              {Object.entries(pipelineLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400 mb-3 px-1">{filtered.length} resultats</p>

      {/* Lead list */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">No s'han trobat leads amb aquests filtres</div>
        )}
        {filtered.map(lead => {
          const project = projects.find(p => p.id === lead.project_id);
          const temp = temperatureColors[lead.temperature];
          const overdue = isOverdue(lead);
          const score = scoreLead(lead);

          return (
            <div key={lead.id} className="p-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3">
                {/* Score indicator */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                  overdue ? 'bg-red-500' : lead.temperature === 'caliente' ? 'bg-orange-500' :
                  lead.priority === 'alta' ? 'bg-amber-500' : 'bg-slate-200'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/LeadDetail?id=${lead.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                          {lead.name || lead.company}
                        </Link>
                        {project && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                            {project.name}
                          </span>
                        )}
                        {overdue && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-2.5 h-2.5" /> Vençut
                          </span>
                        )}
                      </div>
                      {lead.company && lead.name !== lead.company && (
                        <p className="text-xs text-slate-400 mt-0.5">{lead.company}</p>
                      )}
                    </div>
                    {/* Quick actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-colors" title="Email">
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Link to={`/LeadDetail?id=${lead.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors" title="Obrir lead">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: pipelineColors[lead.pipeline_status] || '#94a3b8' }}>
                      {pipelineLabels[lead.pipeline_status] || lead.pipeline_status}
                    </span>
                    {temp && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${temp.bg} ${temp.text}`}>{temp.label}</span>
                    )}
                    {lead.priority === 'alta' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Alta prioritat</span>
                    )}
                    {lead.phone && <span className="text-xs text-slate-400">{lead.phone}</span>}
                  </div>

                  {/* Next action */}
                  {lead.next_action && (
                    <p className={`text-xs mt-1.5 ${overdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      → {lead.next_action}
                      {lead.next_action_date && (
                        <span className="ml-1 font-medium">
                          ({format(new Date(lead.next_action_date), "d MMM", { locale: es })})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}