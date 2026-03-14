import React, { useState } from 'react';
import { useTasks, useLeads, useProjects } from '../components/shared/useAppData';
import TaskRow from '../components/tasks/TaskRow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export default function Tasks() {
  const { data: tasks } = useTasks();
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();
  const [projectFilter, setProjectFilter] = useState('all');
  const [tab, setTab] = useState('pendientes');

  const today = format(new Date(), 'yyyy-MM-dd');

  const filtered = tasks.filter(t => {
    const matchProject = projectFilter === 'all' || t.project_id === projectFilter;
    if (tab === 'pendientes') return matchProject && !t.completed;
    if (tab === 'vencidas') return matchProject && !t.completed && t.due_date && t.due_date < today;
    if (tab === 'hoy') return matchProject && !t.completed && t.due_date === today;
    if (tab === 'completadas') return matchProject && t.completed;
    return matchProject;
  });

  const overdue = tasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const todayCount = tasks.filter(t => !t.completed && t.due_date === today).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tareas</h1>
        <p className="text-sm text-slate-500 mt-1">{tasks.filter(t => !t.completed).length} pendientes · {overdue} vencidas · {todayCount} para hoy</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="vencidas" className="text-red-600">Vencidas ({overdue})</TabsTrigger>
            <TabsTrigger value="completadas">Completadas</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">No hay tareas en esta vista</div>
        )}
        {filtered.map(task => (
          <TaskRow key={task.id} task={task} leads={leads} projects={projects} />
        ))}
      </div>
    </div>
  );
}