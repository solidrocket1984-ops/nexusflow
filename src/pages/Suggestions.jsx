import React, { useState } from 'react';
import { useSuggestions, useProjects, useLeads } from '../components/shared/useAppData';
import { PriorityBadge } from '../components/shared/PipelineBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X, Lightbulb, Phone, CalendarPlus, Mail, RotateCcw, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const typeIcons = {
  llamar: Phone,
  seguimiento: RotateCcw,
  agendar_reunion: CalendarPlus,
  enviar_propuesta: Mail,
  follow_up: ArrowRight,
  bloque_llamadas: Phone,
  reactivar_proyecto: Lightbulb,
};

const typeLabels = {
  llamar: 'Llamar',
  seguimiento: 'Seguimiento',
  agendar_reunion: 'Agendar reunión',
  enviar_propuesta: 'Enviar propuesta',
  follow_up: 'Follow-up',
  bloque_llamadas: 'Bloque de llamadas',
  reactivar_proyecto: 'Reactivar proyecto',
};

export default function Suggestions() {
  const { data: suggestions } = useSuggestions();
  const { data: projects } = useProjects();
  const { data: leads } = useLeads();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const activeSuggestions = suggestions.filter(s => !s.dismissed && !s.completed);
  const filtered = activeSuggestions.filter(s => {
    const matchProject = projectFilter === 'all' || s.project_id === projectFilter;
    const matchPriority = priorityFilter === 'all' || s.priority === priorityFilter;
    return matchProject && matchPriority;
  });

  const markDone = async (id) => {
    await base44.entities.Suggestion.update(id, { completed: true });
    queryClient.invalidateQueries({ queryKey: ['suggestions'] });
  };

  const dismiss = async (id) => {
    await base44.entities.Suggestion.update(id, { dismissed: true });
    queryClient.invalidateQueries({ queryKey: ['suggestions'] });
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">¿Qué hago ahora?</h1>
            <p className="text-sm text-slate-500">{activeSuggestions.length} acciones recomendadas</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Lightbulb className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">¡Todo al día! No hay acciones pendientes.</p>
          </div>
        )}
        {filtered.map(suggestion => {
          const project = projects.find(p => p.id === suggestion.project_id);
          const lead = leads.find(l => l.id === suggestion.lead_id);
          const TypeIcon = typeIcons[suggestion.type] || Lightbulb;

          return (
            <div key={suggestion.id} className="bg-white rounded-2xl border border-slate-200 p-4 lg:p-5 hover:shadow-md hover:shadow-slate-200/50 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0"
                  style={project ? { backgroundColor: `${project.color}15` } : {}}>
                  <TypeIcon className="w-5 h-5" style={project ? { color: project.color } : { color: '#64748b' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{suggestion.reason}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {project && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                            {project.name}
                          </span>
                        )}
                        <PriorityBadge priority={suggestion.priority} />
                        <span className="text-xs text-slate-400">{typeLabels[suggestion.type]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" className="h-8 text-xs font-semibold"
                      style={project ? { backgroundColor: project.color } : {}}
                      onClick={() => markDone(suggestion.id)}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      {suggestion.cta || 'Marcar como hecho'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-slate-600"
                      onClick={() => dismiss(suggestion.id)}>
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