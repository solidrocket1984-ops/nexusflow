import React from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useLeads, useTasks } from '../components/shared/useAppData';
import { PipelineBadge } from '../components/shared/PipelineBadge';
import { Users, CheckSquare, ArrowRight, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const PIPELINE_ORDER = ['nuevo', 'contactado', 'pendiente_respuesta', 'reunion_agendada', 'propuesta_enviada', 'negociacion', 'ganado', 'perdido'];

export default function Projects() {
  const { data: projects } = useProjects();
  const { data: leads } = useLeads();
  const { data: tasks } = useTasks();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Proyectos</h1>
        <p className="text-sm text-slate-500 mt-1">Pipeline comercial de cada proyecto</p>
      </div>

      <div className="space-y-8">
        {projects.map(project => {
          const pLeads = leads.filter(l => l.project_id === project.id);
          const pTasks = tasks.filter(t => t.project_id === project.id && !t.completed);

          return (
            <div key={project.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Project header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center"
                    style={{ backgroundColor: project.color }}>
                    {project.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{project.name}</h2>
                    <p className="text-xs text-slate-400">{pLeads.length} leads · {pTasks.length} tareas pendientes</p>
                  </div>
                </div>
                <Link to={`/ProjectDetail?id=${project.id}`} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                  Ver detalle <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Mini pipeline */}
              <div className="p-5 overflow-x-auto">
                <div className="flex gap-3 min-w-max">
                  {PIPELINE_ORDER.map(status => {
                    const count = pLeads.filter(l => l.pipeline_status === status).length;
                    return (
                      <div key={status} className="min-w-[120px] flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <PipelineBadge status={status} />
                          <span className="text-sm font-bold text-slate-700">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: pLeads.length > 0 ? `${(count / pLeads.length) * 100}%` : '0%',
                              backgroundColor: project.color
                            }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}