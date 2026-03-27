import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { taskTypeLabels, sourceLabels } from '@/lib/crmI18n';

export default function TaskRow({ task, leads, onToggleComplete, onEdit, onDelete, onReschedule }) {
  const lead = leads?.find((l) => l.id === task.lead_id);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = !task.completed && task.due_date && task.due_date < today;

  return (
    <div className={`p-3 hover:bg-slate-50/50 transition-colors flex items-start gap-3 ${task.completed ? 'opacity-60' : ''}`}>
      <button onClick={() => onToggleComplete(task)} className="mt-0.5 flex-shrink-0">
        {task.completed ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Circle className={`w-5 h-5 ${isOverdue ? 'text-red-400' : 'text-slate-300'} hover:text-slate-500`} />}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-slate-600">{taskTypeLabels[task.type] || 'Tasca'}</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{task.priority || 'mitja'}</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{task.urgency || 'mitja'}</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{sourceLabels[task.source] || task.source || 'Manual'}</span>
          {isOverdue && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertCircle className="w-3 h-3" /> Vençuda</span>}
          {lead && <Link to={`/LeadDetail?id=${lead.id}`} className="text-blue-600 hover:underline">{lead.contact_name || lead.company}</Link>}
        </div>
        <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>Data límit: {task.due_date || 'Sense data'}</p>
        {!!task.reason && <p className="text-xs text-indigo-700">Motiu automàtic: {task.reason}</p>}
        <div className="flex gap-1 flex-wrap pt-1">
          <button onClick={() => onReschedule(task, 1)} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50">Assignar a demà</button>
          <button onClick={() => onReschedule(task, 7)} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50">Setmana vinent</button>
          {lead && <Link to={`/LeadDetail?id=${lead.id}`} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50">Obrir lead</Link>}
          <button onClick={() => onEdit(task)} className="text-[10px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50">Editar</button>
          <button onClick={() => onDelete(task)} className="text-[10px] px-2 py-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50">Eliminar</button>
        </div>
      </div>
    </div>
  );
}
