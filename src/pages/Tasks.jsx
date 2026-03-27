import React, { useEffect, useMemo, useState } from 'react';
import { addDays, endOfMonth, endOfWeek, format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskRow from '../components/tasks/TaskRow';
import TaskEditorModal from '../components/tasks/TaskEditorModal';
import { useLeads, useTasks } from '../components/shared/useAppData';
import { ENLLAC_PROJECT_ID } from '../lib/crmUtils';
import { runAutomaticTaskRules } from '../lib/taskAutomation';

export default function Tasks() {
  const { data: tasks = [] } = useTasks();
  const { data: leads = [] } = useLeads();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [completedFilter, setCompletedFilter] = useState('all');
  const [leadFilter, setLeadFilter] = useState('all');
  const [selected, setSelected] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const endWeek = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endMonthDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  useEffect(() => {
    if (!leads.length) return;
    runAutomaticTaskRules(leads, tasks).then((created) => {
      if (created > 0) queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });
  }, [leads.length]);

  const filtered = useMemo(() => tasks.filter((task) => {
    if (typeFilter !== 'all' && task.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (urgencyFilter !== 'all' && task.urgency !== urgencyFilter) return false;
    if (originFilter !== 'all' && task.source !== originFilter) return false;
    if (completedFilter === 'yes' && !task.completed) return false;
    if (completedFilter === 'no' && task.completed) return false;
    if (leadFilter !== 'all' && task.lead_id !== leadFilter) return false;

    if (tab === 'today') return !task.completed && task.due_date === today;
    if (tab === 'this_week') return !task.completed && task.due_date >= today && task.due_date <= endWeek;
    if (tab === 'this_month') return !task.completed && task.due_date >= today && task.due_date <= endMonthDate;
    if (tab === 'overdue') return !task.completed && task.due_date && task.due_date < today;
    if (tab === 'completed') return task.completed;
    return true;
  }), [tasks, tab, typeFilter, priorityFilter, urgencyFilter, originFilter, completedFilter, leadFilter, today, endWeek, endMonthDate]);

  const counters = {
    today: tasks.filter((task) => !task.completed && task.due_date === today).length,
    this_week: tasks.filter((task) => !task.completed && task.due_date >= today && task.due_date <= endWeek).length,
    this_month: tasks.filter((task) => !task.completed && task.due_date >= today && task.due_date <= endMonthDate).length,
    overdue: tasks.filter((task) => !task.completed && task.due_date && task.due_date < today).length,
    completed: tasks.filter((task) => task.completed).length,
  };

  const saveTask = async (payload) => {
    if (editingTask?.id) {
      await base44.entities.Task.update(editingTask.id, payload);
    } else {
      await base44.entities.Task.create({ ...payload, project_id: ENLLAC_PROJECT_ID, task_bucket: 'backlog', source: payload.source || 'manual' });
    }
    setEditingTask(null);
    setShowNew(false);
    setSelected({});
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const toggleComplete = async (task) => {
    await base44.entities.Task.update(task.id, { completed: !task.completed, completed_date: !task.completed ? today : null, status: !task.completed ? 'completada' : 'pendent' });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const reschedule = async (task, days) => {
    const current = task.due_date ? new Date(task.due_date) : new Date();
    await base44.entities.Task.update(task.id, { due_date: format(addDays(current, days), 'yyyy-MM-dd') });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Vols eliminar la tasca "${task.title}"?`)) return;
    await base44.entities.Task.delete(task.id);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const selectedTasks = filtered.filter((task) => selected[task.id]);

  const applyBulk = async (mode) => {
    const updates = selectedTasks.map((task) => {
      if (mode === 'complete') return base44.entities.Task.update(task.id, { completed: true, completed_date: today });
      if (mode === 'tomorrow') return base44.entities.Task.update(task.id, { due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd') });
      if (mode === 'next_week') return base44.entities.Task.update(task.id, { due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd') });
      if (mode === 'priority_high') return base44.entities.Task.update(task.id, { priority: 'alta' });
      if (mode === 'type_followup') return base44.entities.Task.update(task.id, { type: 'seguimiento' });
      return null;
    }).filter(Boolean);
    await Promise.all(updates);
    setSelected({});
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Centre d'execució · Tasques</h1>
          <p className="text-sm text-slate-500">{tasks.filter((task) => !task.completed).length} pendents · {tasks.filter((task) => task.source !== 'manual').length} automàtiques</p>
        </div>
        <Button size="sm" onClick={() => { setEditingTask(null); setShowNew((p) => !p); }} variant={showNew ? 'outline' : 'default'}>
          {showNew ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showNew ? 'Tancar' : 'Nova tasca'}
        </Button>
      </header>

      {showNew && <TaskEditorModal leads={leads} onSave={saveTask} onClose={() => setShowNew(false)} title="Crear tasca manual" />}
      {editingTask && <TaskEditorModal leads={leads} initialTask={editingTask} onSave={saveTask} onClose={() => setEditingTask(null)} title="Editar tasca" />}

      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100 flex-wrap h-auto">
            <TabsTrigger value="today">Avui ({counters.today})</TabsTrigger>
            <TabsTrigger value="this_week">Aquesta setmana ({counters.this_week})</TabsTrigger>
            <TabsTrigger value="this_month">Aquest mes ({counters.this_month})</TabsTrigger>
            <TabsTrigger value="overdue" className="text-red-600">Vençudes ({counters.overdue})</TabsTrigger>
            <TabsTrigger value="completed">Completades ({counters.completed})</TabsTrigger>
            <TabsTrigger value="all">Totes ({tasks.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <FilterSelect value={typeFilter} onValueChange={setTypeFilter} options={[['all','Tipus'], ['call','Trucar'],['visit','Visita'],['seguimiento','Seguiment'],['email','Correu'],['proposal_send','Enviar proposta'],['meeting','Reunió'],['admin','Admin']]} />
          <FilterSelect value={priorityFilter} onValueChange={setPriorityFilter} options={[['all','Prioritat'], ['alta','Alta'],['media','Mitja'],['baja','Baixa']]} />
          <FilterSelect value={urgencyFilter} onValueChange={setUrgencyFilter} options={[['all','Urgència'], ['alta','Alta'],['media','Mitja'],['baja','Baixa']]} />
          <FilterSelect value={originFilter} onValueChange={setOriginFilter} options={[['all','Origen'], ['manual','Manual'],['automatic','Automàtic'],['crm_rule','Regla CRM']]} />
          <FilterSelect value={completedFilter} onValueChange={setCompletedFilter} options={[['all','Completada'], ['no','No'],['yes','Sí']]} />
          <FilterSelect value={leadFilter} onValueChange={setLeadFilter} options={[['all','Lead vinculat'], ...leads.map((lead) => [lead.id, lead.contact_name || lead.company || lead.name])]} />
          <FilterSelect value="bulk" onValueChange={applyBulk} options={[['bulk','Accions massives'], ['complete','Marcar completada'], ['tomorrow','Assignar a demà'], ['next_week','Assignar a setmana vinent'], ['type_followup','Canviar tipus'], ['priority_high','Canviar prioritat']]} />
          <div className="text-xs text-slate-500 flex items-center">Seleccionades: {selectedTasks.length}</div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && <div className="p-8 text-center text-slate-400">No hi ha tasques en aquesta vista</div>}
        {filtered.map((task) => (
          <div key={task.id} className="flex gap-2 items-start">
            <input className="mt-5 ml-2" type="checkbox" checked={!!selected[task.id]} onChange={(e) => setSelected((p) => ({ ...p, [task.id]: e.target.checked }))} />
            <div className="flex-1">
              <TaskRow task={task} leads={leads} onToggleComplete={toggleComplete} onEdit={setEditingTask} onDelete={deleteTask} onReschedule={reschedule} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function FilterSelect({ value, onValueChange, options }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(([key, label]) => <SelectItem value={key} key={key}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
