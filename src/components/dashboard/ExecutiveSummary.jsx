import React from 'react';
import { AlertTriangle, Phone, Clock, Flame, Users, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExecutiveSummary({ leads, tasks, suggestions, projects, allLeads }) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.temperature === 'caliente' && l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;
  const overdueFollowups = leads.filter(l => l.next_action_date && l.next_action_date < today && l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;
  const noActivity = leads.filter(l => l.days_without_activity > 14 && l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;
  const newLeads = leads.filter(l => l.pipeline_status === 'nuevo').length;
  const highPriority = leads.filter(l => l.priority === 'alta' && l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;

  // Pipeline breakdown
  const pipelineGroups = {
    nuevo: leads.filter(l => l.pipeline_status === 'nuevo').length,
    contactado: leads.filter(l => l.pipeline_status === 'contactado').length,
    pendiente_respuesta: leads.filter(l => l.pipeline_status === 'pendiente_respuesta').length,
    reunion_agendada: leads.filter(l => l.pipeline_status === 'reunion_agendada').length,
    propuesta_enviada: leads.filter(l => l.pipeline_status === 'propuesta_enviada').length,
    negociacion: leads.filter(l => l.pipeline_status === 'negociacion').length,
    ganado: leads.filter(l => l.pipeline_status === 'ganado').length,
    perdido: leads.filter(l => l.pipeline_status === 'perdido').length,
  };

  const pipelineLabels = {
    nuevo: 'Nous',
    contactado: 'Contactats',
    pendiente_respuesta: 'Pend. resposta',
    reunion_agendada: 'Reunió',
    propuesta_enviada: 'Proposta',
    negociacion: 'Negociació',
    ganado: 'Guanyats',
    perdido: 'Perduts',
  };

  const pipelineColors = {
    nuevo: 'bg-slate-400',
    contactado: 'bg-blue-400',
    pendiente_respuesta: 'bg-yellow-400',
    reunion_agendada: 'bg-purple-400',
    propuesta_enviada: 'bg-indigo-400',
    negociacion: 'bg-orange-400',
    ganado: 'bg-emerald-500',
    perdido: 'bg-red-400',
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 lg:p-8 text-white">
      <div className="flex flex-col gap-6">
        {/* Top row */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Left */}
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-1">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold mb-1">Resum executiu</h2>
            <p className="text-slate-400 text-sm mb-5">El teu dia comercial en un cop d'ull</p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatBadge icon={Users} value={totalLeads} label="Total leads" color="blue" />
              <StatBadge icon={Flame} value={hotLeads} label="Oportunitats calentes" color="green" />
              <StatBadge icon={AlertTriangle} value={overdueFollowups} label="Accions vençudes" color="red" />
              <StatBadge icon={Phone} value={newLeads} label="Nous (sense contactar)" color="amber" />
              <StatBadge icon={Activity} value={noActivity} label="+14 dies sense activitat" color="purple" />
              <StatBadge icon={Clock} value={highPriority} label="Alta prioritat" color="orange" />
            </div>
          </div>

          {/* Pipeline by project */}
          <div className="lg:w-72 bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Leads per projecte</h3>
            {projects.map(p => {
              const count = allLeads.filter(l => l.project_id === p.id).length;
              const pct = allLeads.length > 0 ? Math.round((count / allLeads.length) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300">{p.name}</span>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Pipeline</h3>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {Object.entries(pipelineGroups).map(([key, count]) => (
              <div key={key} className="text-center">
                <div className={`w-8 h-8 rounded-lg ${pipelineColors[key]}/20 flex items-center justify-center mx-auto mb-1`}>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{pipelineLabels[key]}</p>
              </div>
            ))}
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
    purple: 'bg-purple-500/20 text-purple-300',
    orange: 'bg-orange-500/20 text-orange-300',
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