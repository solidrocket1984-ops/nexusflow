import React, { useState } from 'react';
import { useProjects, useLeads, useTasks, useActivities, useSuggestions } from '../components/shared/useAppData';
import { PipelineBadge, TemperatureBadge, PriorityBadge } from '../components/shared/PipelineBadge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, CheckSquare, Lightbulb, Phone, Mail, Clock, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import LeadRow from '../components/leads/LeadRow';
import TaskRow from '../components/tasks/TaskRow';

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const { data: projects } = useProjects();
  const { data: leads } = useLeads();
  const { data: tasks } = useTasks();
  const { data: suggestions } = useSuggestions();

  const project = projects.find(p => p.id === projectId);
  const projectLeads = leads.filter(l => l.project_id === projectId);
  const projectTasks = tasks.filter(t => t.project_id === projectId);
  const projectSuggestions = suggestions.filter(s => s.project_id === projectId && !s.dismissed && !s.completed);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const activeLeads = projectLeads.filter(l => l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;
  const overdueTasks = projectTasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const hotLeads = projectLeads.filter(l => l.temperature === 'caliente').length;

  return (
    <div>
      <Link to="/Projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a proyectos
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl text-white font-bold text-lg flex items-center justify-center shadow-lg"
            style={{ backgroundColor: project.color }}>
            {project.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <p className="text-sm text-slate-400">{project.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Leads activos" value={activeLeads} icon={Users} />
          <MiniStat label="Tareas pendientes" value={projectTasks.filter(t => !t.completed).length} icon={CheckSquare} />
          <MiniStat label="Tareas vencidas" value={overdueTasks} icon={Clock} alert={overdueTasks > 0} />
          <MiniStat label="Leads calientes" value={hotLeads} icon={Lightbulb} />
        </div>
      </div>

      <Tabs defaultValue="leads">
        <TabsList className="bg-slate-100 mb-4">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="suggestions">Sugerencias</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {projectLeads.length === 0 && (
              <div className="p-8 text-center text-slate-400">No hay leads en este proyecto</div>
            )}
            {projectLeads.map(lead => (
              <LeadRow key={lead.id} lead={lead} projects={projects} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {projectTasks.length === 0 && (
              <div className="p-8 text-center text-slate-400">No hay tareas en este proyecto</div>
            )}
            {projectTasks.map(task => (
              <TaskRow key={task.id} task={task} leads={leads} projects={projects} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="space-y-3">
            {projectSuggestions.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                No hay sugerencias pendientes
              </div>
            )}
            {projectSuggestions.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.reason}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <PriorityBadge priority={s.priority} />
                    <span className="text-xs text-slate-400">{s.type?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: `${project.color}15`, color: project.color }}>
                  {s.cta}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, alert }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}