import React, { useState } from 'react';
import ExecutiveSummary from '../components/dashboard/ExecutiveSummary';
import ProjectCard from '../components/dashboard/ProjectCard';
import WhatShouldIDo from '../components/dashboard/WhatShouldIDo';
import { useProjects, useLeads, useTasks, useSuggestions } from '../components/shared/useAppData';

export default function Dashboard() {
  const { data: projects, isLoading: lp } = useProjects();
  const { data: allLeads, isLoading: ll } = useLeads();
  const { data: tasks, isLoading: lt } = useTasks();
  const { data: suggestions, isLoading: ls } = useSuggestions();
  const [selectedProject, setSelectedProject] = useState('all');

  const isLoading = lp || ll || lt || ls;

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const leads = selectedProject === 'all'
    ? allLeads
    : allLeads.filter(l => l.project_id === selectedProject);

  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter(t => t.project_id === selectedProject);

  const filteredProjects = selectedProject === 'all'
    ? projects
    : projects.filter(p => p.id === selectedProject);

  return (
    <div className="space-y-6">
      {/* Project filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedProject('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedProject === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tots els projectes
        </button>
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProject(p.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedProject === p.id
                ? 'text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            style={selectedProject === p.id ? { backgroundColor: p.color } : {}}
          >
            {p.name}
          </button>
        ))}
      </div>

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