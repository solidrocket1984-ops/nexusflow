import React from 'react';
import ExecutiveSummary from '../components/dashboard/ExecutiveSummary';
import ProjectCard from '../components/dashboard/ProjectCard';
import { useProjects, useLeads, useTasks, useSuggestions } from '../components/shared/useAppData';

export default function Dashboard() {
  const { data: projects, isLoading: lp } = useProjects();
  const { data: leads, isLoading: ll } = useLeads();
  const { data: tasks, isLoading: lt } = useTasks();
  const { data: suggestions, isLoading: ls } = useSuggestions();

  const isLoading = lp || ll || lt || ls;

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <ExecutiveSummary leads={leads} tasks={tasks} suggestions={suggestions} projects={projects} />
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Proyectos</h3>
        <p className="text-sm text-slate-400">Vista general de ejecución comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            leads={leads}
            tasks={tasks}
            suggestions={suggestions}
          />
        ))}
      </div>
    </div>
  );
}