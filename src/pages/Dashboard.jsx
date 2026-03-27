import React from 'react';
import { Link } from 'react-router-dom';
import { useLeads, useTasks, useProposals } from '../components/shared/useAppData';
import { isActiveInPipeline, isHot, isOverdue, isInactive, scoreLead, getTaskBucket } from '../lib/crmUtils';
import ScoreExplanation from '../components/shared/ScoreExplanation';

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
  const automaticTasks = tasks.filter((task) => ['crm_rule', 'automatic'].includes(task.source)).length;
  const manualTasks = tasks.filter((task) => task.source === 'manual').length;
  const hotWithoutTask = hotLeads.filter((lead) => !openTasks.some((task) => task.lead_id === lead.id));

  const nowList = [...overdueNextActions].sort((a, b) => scoreLead(b) - scoreLead(a)).slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Tauler · Enllaç Digital</h1>
        <p className="text-sm text-slate-500 mt-1">Visió operativa per prioritzar contactes, tasques manuals i automàtiques.</p>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Resum executiu</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat title="Leads actius" value={activeLeads.length} />
          <Stat title="Leads calents" value={hotLeads.length} accent="amber" />
          <Stat title="Accions vençudes" value={overdueNextActions.length} accent="red" />
          <Stat title="Pipeline ponderat" value={`€${weightedPipeline.toLocaleString('ca-ES')}`} />
          <Stat title="Tasques automàtiques" value={automaticTasks} />
          <Stat title="Tasques manuals" value={manualTasks} />
          <Stat title="Tasques vençudes" value={openTasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length} accent="red" />
          <Stat title="Leads calents sense tasca" value={hotWithoutTask.length} accent="red" />
          <Stat title="Tasques avui" value={tasksToday.length} />
          <Stat title="Tasques setmana" value={tasksWeek.length} />
          <Stat title="Leads inactius" value={staleLeads.length} accent="red" />
          <Stat title="Propostes pendents" value={proposalPending.length} accent="indigo" />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Link to="/Tasks" className="bg-white border rounded-xl p-4 hover:bg-slate-50">
          <p className="text-sm font-semibold">Accés ràpid a tasques</p>
          <p className="text-xs text-slate-500">Crear tasca manual, completar i reprogramar.</p>
        </Link>
        <Link to="/Leads" className="bg-white border rounded-xl p-4 hover:bg-slate-50">
          <p className="text-sm font-semibold">Transparència del scoring</p>
          <p className="text-xs text-slate-500">Veure factors de puntuació des de llista i detall.</p>
        </Link>
      </section>

      <DashboardList title="Accions prioritàries d'ara" items={nowList} empty="No hi ha leads crítics ara" renderItem={(lead) => (
        <div className="space-y-2" key={lead.id}>
          <LeadLine lead={lead} subtitle={lead.next_action || 'Definir pròxim pas'} />
          <ScoreExplanation lead={lead} compact />
        </div>
      )} />
    </div>
  );
}

function Stat({ title, value, accent = 'slate' }) {
  const colorMap = { slate: 'text-slate-900', red: 'text-red-700', amber: 'text-amber-700', indigo: 'text-indigo-700' };
  return <div className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{title}</p><p className={`text-xl font-bold mt-1 ${colorMap[accent] || colorMap.slate}`}>{value}</p></div>;
}

function DashboardList({ title, items, renderItem, empty }) {
  return <section><h3 className="text-sm font-semibold text-slate-700 mb-2">{title}</h3><div className="space-y-2">{items.length === 0 && <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-400">{empty}</div>}{items.map(renderItem)}</div></section>;
}

function LeadLine({ lead, subtitle }) {
  return <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{lead.contact_name || lead.name || lead.company}</p><p className="text-xs text-slate-500 truncate">{subtitle}</p></div><Link className="text-xs text-blue-600 font-medium" to={`/LeadDetail?id=${lead.id}`}>Obrir lead</Link></div>;
}
