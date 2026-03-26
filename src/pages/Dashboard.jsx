import React from 'react';
import ExecutiveSummary from '../components/dashboard/ExecutiveSummary';
import WhatShouldIDo from '../components/dashboard/WhatShouldIDo';
import { useLeads, useTasks } from '../components/shared/useAppData';

export default function Dashboard() {
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();

  return (
    <div className="space-y-6">
      <ExecutiveSummary leads={leads} tasks={tasks} />
      <WhatShouldIDo leads={leads} />
    </div>
  );
}