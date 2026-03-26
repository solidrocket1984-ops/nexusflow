import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Flame, AlertTriangle, Clock, Phone, ArrowRight, CheckCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const today = format(new Date(), 'yyyy-MM-dd');

function scoreLead(lead) {
  let score = 0;
  // Overdue next action
  if (lead.next_action_date && lead.next_action_date < today) score += 100;
  // Due today
  if (lead.next_action_date === today) score += 80;
  // Hot temperature
  if (lead.temperature === 'caliente') score += 60;
  // High priority
  if (lead.priority === 'alta') score += 40;
  // Urgency field
  if (lead.urgency === 'alta' || lead.urgency === 'urgente') score += 30;
  // Long without activity
  if (lead.days_without_activity > 14) score += 20;
  if (lead.days_without_activity > 30) score += 20;
  // Today action present
  if (lead.today_action) score += 10;
  return score;
}

function getIcon(lead) {
  if (lead.next_action_date && lead.next_action_date < today) return { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' };
  if (lead.temperature === 'caliente') return { Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' };
  if (lead.next_action_date === today) return { Icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' };
  return { Icon: Phone, color: 'text-slate-400', bg: 'bg-slate-50' };
}

function getReason(lead) {
  if (lead.next_action_date && lead.next_action_date < today) return `Acció vençuda: ${lead.next_action || 'Seguiment pendent'}`;
  if (lead.today_action) return lead.today_action;
  if (lead.best_next_action) return lead.best_next_action;
  if (lead.next_action) return lead.next_action;
  if (lead.temperature === 'caliente') return 'Lead calent — prioritza el contacte';
  if (lead.days_without_activity > 14) return `${lead.days_without_activity} dies sense activitat`;
  return 'Seguiment recomanat';
}

export default function WhatShouldIDo({ leads, projects }) {
  const queryClient = useQueryClient();
  const [done, setDone] = useState({});

  const activeLead = leads.filter(l =>
    l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido'
  );

  const sorted = [...activeLead]
    .sort((a, b) => scoreLead(b) - scoreLead(a))
    .slice(0, 6);

  const markDone = async (lead) => {
    setDone(prev => ({ ...prev, [lead.id]: true }));
    await base44.entities.Lead.update(lead.id, { pipeline_status: 'contactado' });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
        No hi ha accions pendents. Tot al dia! 🎉
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Què haig de fer ara?</h3>
          <p className="text-xs text-slate-400 mt-0.5">Prioritzat per urgència i temperatura</p>
        </div>
        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
          {sorted.length} accions
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {sorted.map((lead) => {
          if (done[lead.id]) return null;
          const { Icon, color, bg } = getIcon(lead);
          const reason = getReason(lead);
          const project = projects.find(p => p.id === lead.project_id);
          const isOverdue = lead.next_action_date && lead.next_action_date < today;

          return (
            <div key={lead.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">{lead.name || lead.company}</p>
                  {project && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                      {project.name}
                    </span>
                  )}
                  {lead.temperature === 'caliente' && (
                    <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">🔥 Calent</span>
                  )}
                  {lead.priority === 'alta' && (
                    <span className="text-[10px] font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-md">Alta prioritat</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{reason}</p>
                {lead.next_action_date && (
                  <p className={`text-xs mt-1 font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {isOverdue ? 'Vençut: ' : 'Planificat: '}
                    {format(new Date(lead.next_action_date), "d MMM", { locale: es })}
                  </p>
                )}
                {lead.days_without_activity > 7 && (
                  <p className="text-xs text-slate-400 mt-0.5">{lead.days_without_activity} dies sense activitat</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => markDone(lead)}
                  title="Marcar com a contactat"
                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <Link
                  to={`/Leads?id=${lead.id}`}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-colors"
                  title="Obrir lead"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}