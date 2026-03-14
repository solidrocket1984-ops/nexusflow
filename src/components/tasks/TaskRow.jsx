import React from 'react';
import { PriorityBadge } from '../shared/PipelineBadge';
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const typeLabels = {
  llamada: '📞 Llamada',
  seguimiento: '🔄 Seguimiento',
  reunion: '🤝 Reunión',
  propuesta: '📄 Propuesta',
  email: '✉️ Email',
  otro: '📋 Otro',
};

export default function TaskRow({ task, leads, projects }) {
  const queryClient = useQueryClient();
  const project = projects.find(p => p.id === task.project_id);
  const lead = leads?.find(l => l.id === task.lead_id);
  const today = format(new Date(), 'yyyy-MM-dd');
  const isOverdue = !task.completed && task.due_date && task.due_date < today;

  const toggleComplete = async (e) => {
    e.stopPropagation();
    await base44.entities.Task.update(task.id, { completed: !task.completed, status: task.completed ? 'pendiente' : 'completada' });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <div className={`p-4 hover:bg-slate-50/50 transition-colors flex items-start gap-3 ${task.completed ? 'opacity-50' : ''}`}>
      <button onClick={toggleComplete} className="mt-0.5 flex-shrink-0">
        {task.completed
          ? <CheckCircle className="w-5 h-5 text-emerald-500" />
          : <Circle className={`w-5 h-5 ${isOverdue ? 'text-red-400' : 'text-slate-300'} hover:text-slate-500 transition-colors`} />
        }
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-slate-500">{typeLabels[task.type] || task.type}</span>
          <PriorityBadge priority={task.priority} />
          {project && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${project.color}15`, color: project.color }}>
              {project.name}
            </span>
          )}
          {isOverdue && (
            <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
              <AlertCircle className="w-3 h-3" /> Vencida
            </span>
          )}
        </div>
        {task.due_date && (
          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
            <Clock className="w-3 h-3 inline mr-1" />
            {format(new Date(task.due_date), "d 'de' MMM", { locale: es })}
          </p>
        )}
      </div>
    </div>
  );
}