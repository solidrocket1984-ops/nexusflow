import React, { useMemo, useState } from 'react';
import { addDays, endOfMonth, endOfWeek, format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskRow from '../components/tasks/TaskRow';
import { useLeads, useTasks } from '../components/shared/useAppData';
import { ENLLAC_PROJECT_ID } from '../lib/crmUtils';

export default function Tasks() {
  const { data: tasks = [] } = useTasks();
  const { data: leads = [] } = useLeads();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', due_date: '', type: 'seguimiento', priority: 'media' });

  const today = format(new Date(), 'yyyy-MM-dd');
  const endWeek = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endMonthDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (typeFilter !== 'all' && task.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (urgencyFilter !== 'all' && task.urgency !== urgencyFilter) return false;

      if (tab === 'today') return !task.completed && task.due_date === today;
      if (tab === 'this_week') return !task.completed && task.due_date >= today && task.due_date <= endWeek;
      if (tab === 'this_month') return !task.completed && task.due_date >= today && task.due_date <= endMonthDate;
      if (tab === 'overdue') return !task.completed && task.due_date && task.due_date < today;
      if (tab === 'completed') return task.completed;
      return true;
    });
  }, [tasks, tab, typeFilter, priorityFilter, urgencyFilter, today, endWeek, endMonthDate]);

  const counters = {
    today: tasks.filter((task) => !task.completed && task.due_date === today).length,
    this_week: tasks.filter((task) => !task.completed && task.due_date >= today && task.due_date <= endWeek).length,
    this_month: tasks.filter((task) => !task.completed && task.due_date >= today && task.due_date <= endMonthDate).length,
    overdue: tasks.filter((task) => !task.completed && task.due_date && task.due_date < today).length,
    completed: tasks.filter((task) => task.completed).length,
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    await base44.entities.Task.create({
      ...newTask,
      completed: false,
      source: 'manual',
      recurrence: 'none',
      project_id: ENLLAC_PROJECT_ID,
      task_bucket: 'backlog',
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setNewTask({ title: '', due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'), type: 'seguimiento', priority: 'media' });
    setShowNew(false);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Execution center · Tasques</h1>
          <p className="text-sm text-slate-500">{tasks.filter((task) => !task.completed).length} pendents · {counters.overdue} vençudes</p>
        </div>
        <Button size="sm" onClick={() => setShowNew((p) => !p)} variant={showNew ? 'outline' : 'default'}>
          {showNew ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showNew ? 'Tancar' : 'Nova tasca'}
        </Button>
      </header>

      {showNew && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 grid grid-cols-1 lg:grid-cols-5 gap-2">
          <Input value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} placeholder="Títol tasca" className="lg:col-span-2" />
          <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))} />
          <Select value={newTask.type} onValueChange={(v) => setNewTask((p) => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="seguimiento">Seguiment</SelectItem>
              <SelectItem value="llamada">Trucada</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="reunion">Reunió</SelectItem>
              <SelectItem value="propuesta">Proposta</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={createTask}>Crear</Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-slate-100 flex-wrap h-auto">
            <TabsTrigger value="today">Today ({counters.today})</TabsTrigger>
            <TabsTrigger value="this_week">This week ({counters.this_week})</TabsTrigger>
            <TabsTrigger value="this_month">This month ({counters.this_month})</TabsTrigger>
            <TabsTrigger value="overdue" className="text-red-600">Overdue ({counters.overdue})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({counters.completed})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <FilterSelect value={priorityFilter} onValueChange={setPriorityFilter} options={[['all', 'Prioritat: totes'], ['alta', 'Alta'], ['media', 'Mitja'], ['baja', 'Baixa']]} />
          <FilterSelect value={urgencyFilter} onValueChange={setUrgencyFilter} options={[['all', 'Urgència: totes'], ['alta', 'Alta'], ['media', 'Mitja'], ['baja', 'Baixa']]} />
          <FilterSelect value={typeFilter} onValueChange={setTypeFilter} options={[['all', 'Tipus: tots'], ['seguimiento', 'Seguiment'], ['llamada', 'Trucada'], ['email', 'Email'], ['reunion', 'Reunió'], ['propuesta', 'Proposta']]} />
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && <div className="p-8 text-center text-slate-400">No hi ha tasques en aquesta vista</div>}
        {filtered.map((task) => (
          <TaskRow key={task.id} task={task} leads={leads} askNextStep />
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
