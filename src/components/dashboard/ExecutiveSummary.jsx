import React from 'react';
import { AlertTriangle, Phone, Clock, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExecutiveSummary({ leads, tasks, suggestions, projects }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const leadsToContact = leads.filter(l => l.pipeline_status === 'nuevo').length;
  const overdueFollowups = tasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const todayTasks = tasks.filter(t => !t.completed && t.due_date === today).length;
  const hotLeads = leads.filter(l => l.temperature === 'caliente' && l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;

  // Find project needing most attention
  const projectAttention = projects.map(p => {
    const pLeads = leads.filter(l => l.project_id === p.id);
    const pTasks = tasks.filter(t => t.project_id === p.id && !t.completed);
    const overdue = pTasks.filter(t => t.due_date && t.due_date < today).length;
    const newLeads = pLeads.filter(l => l.pipeline_status === 'nuevo').length;
    return { ...p, score: overdue * 3 + newLeads * 2 + pTasks.length };
  }).sort((a, b) => b.score - a.score)[0];

  const topSuggestions = suggestions.filter(s => !s.dismissed && !s.completed).slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 lg:p-8 text-white mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Left: greeting + stats */}
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium mb-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold mb-4">Resumen ejecutivo</h2>
          
          {projectAttention && projectAttention.score > 0 && (
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2 mb-5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-200 text-sm font-medium">
                <strong className="text-amber-100">{projectAttention.name}</strong> necesita tu atención hoy
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatBadge icon={Phone} value={leadsToContact} label="Leads sin contactar" color="red" />
            <StatBadge icon={Clock} value={overdueFollowups} label="Seguimientos vencidos" color="amber" />
            <StatBadge icon={Calendar} value={todayTasks} label="Tareas de hoy" color="blue" />
            <StatBadge icon={AlertTriangle} value={hotLeads} label="Oportunidades calientes" color="green" />
          </div>
        </div>

        {/* Right: top 3 actions */}
        <div className="lg:w-80 bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            3 Acciones para hoy
          </h3>
          <div className="space-y-2.5">
            {topSuggestions.map((s, i) => {
              const project = projects.find(p => p.id === s.project_id);
              return (
                <div key={s.id || i} className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white leading-snug">{s.reason}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{project?.name}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />
                </div>
              );
            })}
            {topSuggestions.length === 0 && (
              <p className="text-sm text-slate-400">¡Todo al día! No hay acciones pendientes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ icon: Icon, value, label, color }) {
  const colors = {
    red: 'bg-red-500/20 text-red-300',
    amber: 'bg-amber-500/20 text-amber-300',
    blue: 'bg-blue-500/20 text-blue-300',
    green: 'bg-emerald-500/20 text-emerald-300',
  };
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}