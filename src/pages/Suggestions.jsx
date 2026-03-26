import React, { useState } from 'react';
import { useProjects, useLeads } from '../components/shared/useAppData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X, Lightbulb, Phone, CalendarPlus, Mail, RotateCcw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateSuggestionsFromLeads } from '../lib/crmUtils';

const typeIcons = {
  llamar: Phone,
  seguimiento: RotateCcw,
  agendar_reunion: CalendarPlus,
  enviar_propuesta: Mail,
  follow_up: ArrowRight,
  reactivar_proyecto: Lightbulb,
};

export default function Suggestions() {
  const { data: projects } = useProjects();
  const { data: leads } = useLeads();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dismissed, setDismissed] = useState({});
  const [done, setDone] = useState({});

  // Generate suggestions directly from lead CRM logic
  const allSuggestions = generateSuggestionsFromLeads(leads);

  const filtered = allSuggestions.filter(s => {
    if (dismissed[s.id] || done[s.id]) return false;
    const matchProject = projectFilter === 'all' || s.project_id === projectFilter;
    const matchPriority = priorityFilter === 'all' || s.priority === priorityFilter;
    return matchProject && matchPriority;
  });

  const markDone = async (s) => {
    setDone(prev => ({ ...prev, [s.id]: true }));
    await base44.entities.Lead.update(s.lead_id, { pipeline_status: 'contactado' });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const dismiss = (id) => setDismissed(prev => ({ ...prev, [id]: true }));

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Que haig de fer ara?</h1>
            <p className="text-sm text-slate-500">{filtered.length} accions recomanades · generades dels leads reals</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Projecte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tots</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Prioritat" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Totes</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Mitja</SelectItem>
            <SelectItem value="baja">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Lightbulb className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Tot al dia! No hi ha accions pendents.</p>
          </div>
        )}
        {filtered.map(s => {
          const project = projects.find(p => p.id === s.project_id);
          const TypeIcon = typeIcons[s.type] || Lightbulb;
          const lead = s.lead;

          return (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-5 hover:shadow-md hover:shadow-slate-200/50 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: project ? `${project.color}15` : '#f1f5f9' }}>
                  <TypeIcon className="w-5 h-5" style={{ color: project?.color || '#64748b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/LeadDetail?id=${lead?.id}`} className="font-semibold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                        {lead?.name || lead?.company}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {project && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                            {project.name}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.priority === 'alta' ? 'bg-red-100 text-red-700' :
                          s.priority === 'media' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{s.priority}</span>
                        <span className="text-[10px] text-slate-400">score: {s.score}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mt-1.5">{s.reason}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" className="h-8 text-xs font-semibold"
                      style={project ? { backgroundColor: project.color } : {}}
                      onClick={() => markDone(s)}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      {s.cta}
                    </Button>
                    <Link to={`/LeadDetail?id=${lead?.id}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        Obrir lead
                      </Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-slate-600 ml-auto"
                      onClick={() => dismiss(s.id)}>
                      <X className="w-3.5 h-3.5 mr-1" /> Descartar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}