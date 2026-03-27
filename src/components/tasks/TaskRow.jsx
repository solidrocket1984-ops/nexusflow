import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Circle, Clock, AlertCircle, CalendarClock, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

const typeLabels = {
  llamada: '📞 Trucada',
  seguimiento: '🔄 Seguiment',
  reunion: '🤝 Reunió',
  propuesta: '📄 Proposta',
  email: '✉️ Email',
  otro: '📋 Altre',
};

export default function TaskRow({ task, leads, askNextStep = false }) {
  const queryClient = useQueryClient();
  const lead = leads?.find((l) => l.id === task.lead_id);
  const today = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = !task.completed && task.due_date && task.due_date < today;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const toggleComplete = async () => {
    const completed = !task.completed;
    await base44.entities.Task.update(task.id, {
      completed,
      status: completed ? 'completada' : 'pendiente',
      completed_date: completed ? today : null,
    });

    if (completed && askNextStep && task.lead_id) {
      const next = window.prompt('Vols registrar el següent pas del lead? (text opcional)');
      if (next?.trim()) {
        await base44.entities.Activity.create({
          lead_id: task.lead_id,
          type: 'note',
          subject: `Tasques completada: ${task.title}`,
          summary: next.trim(),
          activity_date: new Date().toISOString(),
          auto_generated: true,
        });
        await base44.entities.Lead.update(task.lead_id, { next_action: next.trim(), last_activity_date: today });
      }
    }
    refresh();
  };

  const reschedule = async (days) => {
    const current = task.due_date ? new Date(task.due_date) : new Date();
    const due_date = format(addDays(current, days), 'yyyy-MM-dd');
    await base44.entities.Task.update(task.id, { due_date, task_bucket: 'backlog' });
    refresh();
  };

  return (
    <div className={`p-3 hover:bg-slate-50/50 transition-colors flex items-start gap-3 ${task.completed ? 'opacity-50' : ''}`}>
      <button onClick={toggleComplete} className="mt-0.5 flex-shrink-0">
        {task.completed ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Circle className={`w-5 h-5 ${isOverdue ? 'text-red-400' : 'text-slate-300'} hover:text-slate-500`} />}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">{typeLabels[task.type] || task.type || 'Tasca'}</span>
          {task.priority && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{task.priority}</span>}
          {isOverdue && <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium"><AlertCircle className="w-3 h-3" /> Vençuda</span>}
          {lead && <Link to={`/LeadDetail?id=${lead.id}`} className="text-[10px] text-blue-600 hover:underline">{lead.contact_name || lead.name || lead.company}</Link>}
        </div>
        {task.due_date && <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}><Clock className="w-3 h-3 inline mr-1" />{format(new Date(task.due_date), "d 'de' MMM", { locale: es })}</p>}
        {!task.completed && (
          <div className="flex gap-1 flex-wrap pt-1">
            <button onClick={() => reschedule(1)} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50">Demà</button>
            <button onClick={() => reschedule(7)} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50">+1 setmana</button>
            <button onClick={() => reschedule(30)} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50">+1 mes</button>
            <Link to="/Agenda" className="inline-flex items-center text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50"><CalendarClock className="w-3 h-3 mr-1" />Agenda</Link>
            {lead && <Link to={`/LeadDetail?id=${lead.id}`} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50"><ArrowRight className="w-3 h-3 mr-1" />Lead</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
