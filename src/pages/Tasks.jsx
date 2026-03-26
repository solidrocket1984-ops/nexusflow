import React, { useState } from 'react';
import { useTasks, useLeads, useProjects } from '../components/shared/useAppData';
import TaskRow from '../components/tasks/TaskRow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { getTaskBucket } from '../lib/crmUtils';

export default function Tasks() {
  const { data: tasks } = useTasks();
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState('all');
  const [tab, setTab] = useState('today');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newProject, setNewProject] = useState('');
  const [saving, setSaving] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const endWeek = format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd');

  const filtered = tasks.filter(t => {
    const matchProject = projectFilter === 'all' || t.project_id === projectFilter;
    if (!matchProject) return false;
    if (tab === 'today') return !t.completed && t.due_date === today;
    if (tab === 'this_week') return !t.completed && t.due_date > today && t.due_date <= endWeek;
    if (tab === 'overdue') return !t.completed && t.due_date && t.due_date < today;
    if (tab === 'pending') return !t.completed;
    if (tab === 'completed') return t.completed;
    return true;
  });

  const overdue = tasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const todayCount = tasks.filter(t => !t.completed && t.due_date === today).length;
  const thisWeekCount = tasks.filter(t => !t.completed && t.due_date > today && t.due_date <= endWeek).length;

  const saveTask = async () => {
    if (!newTitle.trim() || !newProject) return;
    setSaving(true);
    await base44.entities.Task.create({
      title: newTitle,
      project_id: newProject,
      due_date: newDate || null,
      status: 'pendiente',
      completed: false,
      source: 'manual',
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setNewTitle('');
    setNewDate('');
    setShowNew(false);
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasques</h1>
          <p className="text-sm text-slate-500 mt-1">
            {todayCount} avui · {overdue > 0 && <span className="text-red-600 font-medium">{overdue} vençudes · </span>}
            {tasks.filter(t => !t.completed).length} pendents total
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)} variant={showNew ? 'outline' : 'default'} className="text-xs">
          {showNew ? <X className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          {showNew ? 'Cancel·lar' : 'Nova tasca'}
        </Button>
      </div>

      {showNew && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Títol de la tasca..." autoFocus />
          <div className="flex gap-3">
            <Select value={newProject} onValueChange={setNewProject}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Projecte *" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-40" />
            <Button onClick={saveTask} disabled={saving || !newTitle.trim() || !newProject} size="sm">
              {saving ? '...' : 'Crear'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList className="bg-slate-100 flex-wrap h-auto">
            <TabsTrigger value="today" className="text-xs">Avui ({todayCount})</TabsTrigger>
            <TabsTrigger value="this_week" className="text-xs">Setmana ({thisWeekCount})</TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs text-red-600">Vençudes ({overdue})</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Totes pendents</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completades</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Projecte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tots</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">No hi ha tasques en aquesta vista</div>
        )}
        {filtered.map(task => (
          <TaskRow key={task.id} task={task} leads={leads} projects={projects} />
        ))}
      </div>
    </div>
  );
}