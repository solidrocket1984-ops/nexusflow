import React from 'react';
import ExecutiveSummary from '../components/dashboard/ExecutiveSummary';
import ProjectCard from '../components/dashboard/ProjectCard';
import WhatShouldIDo from '../components/dashboard/WhatShouldIDo';
import { useProjects, useLeads, useTasks, useSuggestions } from '../components/shared/useAppData';

export default function Dashboard() {
  const { data: projects, isLoading: lp } = useProjects();
  const { data: allLeads, isLoading: ll } = useLeads();
  const { data: tasks, isLoading: lt } = useTasks();
  const { data: suggestions, isLoading: ls } = useSuggestions();
  const leads = allLeads;
  const filteredTasks = tasks;
  const filteredProjects = projects;

  return (
    <div className="space-y-6">

      <ExecutiveSummary leads={leads} tasks={filteredTasks} suggestions={suggestions} projects={projects} allLeads={allLeads} />

      {/* What should I do now */}
      <WhatShouldIDo leads={leads} projects={projects} />

      {/* Projects */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Projectes</h3>
          <p className="text-sm text-slate-400">Vista general d'execució comercial</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              leads={allLeads}
              tasks={tasks}
              suggestions={suggestions}
            />
          ))}
        </div>
      </div>
    </div>
  );
}