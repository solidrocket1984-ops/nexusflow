import React, { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLeads, useTasks } from '../components/shared/useAppData';

export default function Agenda() {
  const { data: tasks = [] } = useTasks();
  const { data: leads = [] } = useLeads();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);

  const weekStart = startOfWeek(addDays(new Date(), offset * 7), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addDays(new Date(), offset * 7), { weekStartsOn: 1 });

  const items = useMemo(() => {
    const taskItems = tasks.filter((task) => !task.completed && task.due_date).map((task) => ({
      id: `task-${task.id}`,
      date: task.due_date,
      type: 'task',
      label: task.title,
      lead_id: task.lead_id,
      refId: task.id,
    }));

    const leadItems = leads.flatMap((lead) => ([
      lead.next_action_date ? { id: `lead-next-${lead.id}`, date: lead.next_action_date, type: 'next_action', label: lead.next_action || 'Pròxima acció', lead_id: lead.id, refId: lead.id } : null,
      lead.demo_date ? { id: `lead-demo-${lead.id}`, date: lead.demo_date, type: 'demo', label: 'Demo', lead_id: lead.id, refId: lead.id } : null,
      lead.proposal_date ? { id: `lead-prop-${lead.id}`, date: lead.proposal_date, type: 'proposal', label: 'Data proposta', lead_id: lead.id, refId: lead.id } : null,
      lead.closing_date ? { id: `lead-close-${lead.id}`, date: lead.closing_date, type: 'closing', label: 'Tancament previst', lead_id: lead.id, refId: lead.id } : null,
    ].filter(Boolean)));

    return [...taskItems, ...leadItems]
      .filter((item) => item.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, leads]);

  const inRangeItems = items.filter((item) => item.date >= format(weekStart, 'yyyy-MM-dd') && item.date <= format(weekEnd, 'yyyy-MM-dd'));

  const moveDate = async (item, days) => {
    const newDate = format(addDays(new Date(item.date), days), 'yyyy-MM-dd');
    if (item.type === 'task') {
      await base44.entities.Task.update(item.refId, { due_date: newDate });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } else if (item.type === 'next_action') {
      await base44.entities.Lead.update(item.refId, { next_action_date: newDate });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } else if (item.type === 'demo') {
      await base44.entities.Lead.update(item.refId, { demo_date: newDate });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } else if (item.type === 'proposal') {
      await base44.entities.Lead.update(item.refId, { proposal_date: newDate });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } else if (item.type === 'closing') {
      await base44.entities.Lead.update(item.refId, { closing_date: newDate });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  };

  const createFollowupTask = async (item) => {
    if (!item.lead_id) return;
    await base44.entities.Task.create({
      project_id: 'enllac_digital',
      lead_id: item.lead_id,
      title: `Follow-up: ${item.label}`,
      type: 'seguimiento',
      priority: 'media',
      due_date: format(addDays(new Date(item.date), 1), 'yyyy-MM-dd'),
      completed: false,
      source: 'manual',
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Agenda CRM</h1>
        <p className="text-sm text-slate-500">Vista interna de planning (tasques + dates comercials del lead).</p>
      </header>

      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3">
        <Button variant="outline" size="sm" onClick={() => setOffset((p) => p - 1)}>Setmana anterior</Button>
        <p className="text-sm font-medium text-slate-700">{format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}</p>
        <Button variant="outline" size="sm" onClick={() => setOffset((p) => p + 1)}>Setmana següent</Button>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {inRangeItems.length === 0 && <div className="p-8 text-center text-slate-400">No hi ha elements en aquesta setmana.</div>}
        {inRangeItems.map((item) => (
          <div key={item.id} className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><CalendarClock className="w-4 h-4 text-slate-500" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{item.type} · {item.date}</p>
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              {item.lead_id && <Link to={`/LeadDetail?id=${item.lead_id}`} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Obrir lead</Link>}
              {item.type === 'task' ? <Link to="/Tasks" className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Obrir tasca</Link> : null}
              <button onClick={() => moveDate(item, 1)} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">+1 dia</button>
              <button onClick={() => moveDate(item, 7)} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">+1 setmana</button>
              {item.lead_id && <button onClick={() => createFollowupTask(item)} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Crear follow-up</button>}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
