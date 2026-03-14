import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, Clock, Flame, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const statusLabels = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  pendiente_respuesta: 'Pend. respuesta',
  reunion_agendada: 'Reunión agendada',
  propuesta_enviada: 'Propuesta enviada',
  negociacion: 'Negociación',
  ganado: 'Ganado',
  perdido: 'Perdido',
};

export default function ProjectCard({ project, leads, tasks, suggestions }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const projectLeads = leads.filter(l => l.project_id === project.id);
  const projectTasks = tasks.filter(t => t.project_id === project.id);
  const projectSuggestions = suggestions.filter(s => s.project_id === project.id && !s.dismissed && !s.completed);

  const activeLeads = projectLeads.filter(l => l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;
  const uncontacted = projectLeads.filter(l => l.pipeline_status === 'nuevo').length;
  const pendingFollowups = projectTasks.filter(t => !t.completed && (t.type === 'seguimiento' || t.type === 'llamada')).length;
  const hotOpportunities = projectLeads.filter(l => l.temperature === 'caliente' && l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;
  const overdueTasks = projectTasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const nextSuggestion = projectSuggestions[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="p-5 lg:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
              style={{ backgroundColor: project.color, boxShadow: `0 4px 14px ${project.color}33` }}>
              {project.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{project.name}</h3>
              <p className="text-xs text-slate-400">{project.description}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
            Activo
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Stat icon={Users} label="Leads activos" value={activeLeads} />
          <Stat icon={Phone} label="Sin contactar" value={uncontacted} alert={uncontacted > 0} />
          <Stat icon={Clock} label="Seguimientos" value={pendingFollowups} />
          <Stat icon={Flame} label="Calientes" value={hotOpportunities} hot={hotOpportunities > 0} />
        </div>

        {overdueTasks > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs text-red-700 font-medium">{overdueTasks} tarea{overdueTasks !== 1 ? 's' : ''} vencida{overdueTasks !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Next step */}
        {nextSuggestion && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1">Siguiente paso</p>
            <p className="text-sm text-slate-700 font-medium">{nextSuggestion.reason}</p>
            <span className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: `${project.color}15`, color: project.color }}>
              {nextSuggestion.cta}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <Link to={`/ProjectDetail?id=${project.id}`}
        className="flex items-center justify-between px-5 lg:px-6 py-3 border-t border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 transition-colors">
        <span className="text-sm font-medium text-slate-600">Ver proyecto</span>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

function Stat({ icon: Icon, label, value, alert, hot }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
      <Icon className={`w-3.5 h-3.5 ${alert ? 'text-red-500' : hot ? 'text-orange-500' : 'text-slate-400'}`} />
      <div>
        <p className={`text-base font-bold ${alert ? 'text-red-600' : hot ? 'text-orange-600' : 'text-slate-900'}`}>{value}</p>
        <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
      </div>
    </div>
  );
}