import React from 'react';
import { Link } from 'react-router-dom';
import { useLeads, useTasks, useProposals } from '../components/shared/useAppData';
import { isActiveInPipeline, isHot, isOverdue, isInactive, scoreLead, getTaskBucket } from '../lib/crmUtils';

export default function Dashboard() {
  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();
  const { data: proposals = [] } = useProposals();

  const activeLeads = leads.filter(isActiveInPipeline);
  const hotLeads = activeLeads.filter(isHot);
  const overdueNextActions = activeLeads.filter(isOverdue);
  const staleLeads = activeLeads.filter((l) => isInactive(l, 21));
  const weightedPipeline = activeLeads.reduce((acc, lead) => acc + Number(lead.weighted_value || 0), 0);

  const openTasks = tasks.filter((task) => !task.completed);
  const tasksToday = openTasks.filter((task) => getTaskBucket(task) === 'today');
  const tasksWeek = openTasks.filter((task) => ['today', 'this_week'].includes(getTaskBucket(task)));
  const proposalPending = proposals.filter((proposal) => ['draft', 'sent'].includes(proposal.status));

  const nowList = [...overdueNextActions]
    .sort((a, b) => scoreLead(b) - scoreLead(a))
    .slice(0, 6);

  const todayList = [...tasksToday].slice(0, 6);
  const thisWeekList = [...tasksWeek].slice(0, 6);
  const proposalFollowups = proposalPending.slice(0, 6);
  const staleList = staleLeads.slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Command Center · Enllaç Digital</h1>
        <p className="text-sm text-slate-500 mt-1">CRM operatiu diari, setmanal i mensual des d'una sola vista.</p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Executive summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat title="Leads actius" value={activeLeads.length} />
          <Stat title="Leads calents" value={hotLeads.length} accent="amber" />
          <Stat title="Next actions vençudes" value={overdueNextActions.length} accent="red" />
          <Stat title="Pipeline ponderat" value={`€${weightedPipeline.toLocaleString('es-ES')}`} />
          <Stat title="Tasques avui" value={tasksToday.length} />
          <Stat title="Tasques aquesta setmana" value={tasksWeek.length} />
          <Stat title="Leads estancats" value={staleLeads.length} accent="red" />
          <Stat title="Propostes pendents" value={proposalPending.length} accent="indigo" />
        </div>
      </section>

      <DashboardList title="What should I do now?" items={nowList} empty="No hi ha leads crítics ara" renderItem={(lead) => (
        <LeadLine lead={lead} subtitle={lead.next_action || 'Definir pròxim pas'} />
      )} />

      <DashboardList title="Today" items={todayList} empty="No hi ha tasques per avui" renderItem={(task) => (
        <TaskLine task={task} />
      )} />

      <DashboardList title="This week" items={thisWeekList} empty="No hi ha tasques de setmana" renderItem={(task) => (
        <TaskLine task={task} />
      )} />

      <DashboardList title="Proposal follow-ups" items={proposalFollowups} empty="No hi ha follow-ups de proposta" renderItem={(proposal) => (
        <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
          <div>
            <p className="text-sm font-semibold text-slate-900">{proposal.title}</p>
            <p className="text-xs text-slate-500">{proposal.status} · {proposal.sent_date || 'sense data d\'enviament'}</p>
          </div>
          <Link className="text-xs text-blue-600 font-medium" to={`/LeadDetail?id=${proposal.lead_id}`}>Obrir lead</Link>
        </div>
      )} />

      <DashboardList title="Stale leads needing reactivation" items={staleList} empty="No hi ha leads estancats" renderItem={(lead) => (
        <LeadLine lead={lead} subtitle={`${lead.days_without_activity || 0} dies sense activitat`} />
      )} />
    </div>
  );
}

function Stat({ title, value, accent = 'slate' }) {
  const colorMap = {
    slate: 'text-slate-900',
    red: 'text-red-700',
    amber: 'text-amber-700',
    indigo: 'text-indigo-700',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`text-xl font-bold mt-1 ${colorMap[accent] || colorMap.slate}`}>{value}</p>
    </div>
  );
}

function DashboardList({ title, items, renderItem, empty }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 && <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-400">{empty}</div>}
        {items.map(renderItem)}
      </div>
    </section>
  );
}

function LeadLine({ lead, subtitle }) {
  return (
    <div key={lead.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{lead.contact_name || lead.name || lead.company}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <Link className="text-xs text-blue-600 font-medium" to={`/LeadDetail?id=${lead.id}`}>Obrir</Link>
    </div>
  );
}

function TaskLine({ task }) {
  return (
    <div key={task.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
        <p className="text-xs text-slate-500">Venciment: {task.due_date || 'sense data'}</p>
      </div>
      {task.lead_id ? <Link className="text-xs text-blue-600 font-medium" to={`/LeadDetail?id=${task.lead_id}`}>Obrir lead</Link> : <Link className="text-xs text-blue-600 font-medium" to="/Tasks">Veure tasca</Link>}
    </div>
  );
}
