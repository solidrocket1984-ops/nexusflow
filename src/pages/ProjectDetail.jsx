import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLeads, useTasks } from '../components/shared/useAppData';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, CheckSquare, Clock, Lightbulb, Receipt, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import LeadRow from '../components/leads/LeadRow';
import TaskRow from '../components/tasks/TaskRow';
import { normalizeProjectId } from '@/lib/projects';

function formatEuro(n) {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
}

const invoiceStatusLabels = { draft: 'Esborrany', sent: 'Enviada', paid: 'Pagada', overdue: 'Vençuda', cancelled: 'Cancel·lada' };
const invoiceStatusColors = { draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700', paid: 'bg-emerald-100 text-emerald-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-400' };
const recurringStatusColors = { active: 'bg-emerald-100 text-emerald-700', paused: 'bg-amber-100 text-amber-700', cancelled: 'bg-slate-100 text-slate-400' };
const freqLabels = { monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' };
const proposalStatusLabels = { draft: 'Esborrany', sent: 'Enviada', accepted: 'Acceptada', rejected: 'Rebutjada' };

export default function ProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const { data: leads = [] } = useLeads();
  const { data: tasks = [] } = useTasks();

  const { data: projectEntity } = useQuery({
    queryKey: ['project-entity', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }),
    enabled: !!projectId,
    select: (data) => data?.[0] || null,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['project-invoices', projectId],
    queryFn: () => base44.entities.Invoice.filter({ project_id: projectId }, '-issue_date'),
    enabled: !!projectId,
    initialData: [],
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ['project-recurring', projectId],
    queryFn: () => base44.entities.RecurringPayment.filter({ project_id: projectId }, '-start_date'),
    enabled: !!projectId,
    initialData: [],
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['project-proposals', projectId],
    queryFn: () => base44.entities.Proposal.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId,
    initialData: [],
  });

  // Filter leads by project_id using normalizeProjectId for compatibility
  const projectLeads = leads.filter(l => normalizeProjectId(l.project_id) === normalizeProjectId(projectId));
  const projectTasks = tasks.filter(t => t.project_id === projectId);

  const today = format(new Date(), 'yyyy-MM-dd');
  const activeLeads = projectLeads.filter(l => l.pipeline_status !== 'ganado' && l.pipeline_status !== 'perdido').length;
  const overdueTasks = projectTasks.filter(t => !t.completed && t.due_date && t.due_date < today).length;
  const hotLeads = projectLeads.filter(l => l.temperature === 'caliente').length;
  const mrr = recurring.filter(r => r.status === 'active' && r.frequency === 'monthly').reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const acceptedProposals = proposals.filter(p => p.status === 'accepted');

  const project = projectEntity || { name: '…', color: '#64748b', description: '' };

  return (
    <div>
      <Link to="/Projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Tornar a projectes
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl text-white font-bold text-lg flex items-center justify-center shadow-lg"
            style={{ backgroundColor: project.color || '#64748b' }}>
            {project.name?.charAt(0) || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <p className="text-sm text-slate-400">{project.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Leads actius" value={activeLeads} icon={Users} />
          <MiniStat label="Tasques pendents" value={projectTasks.filter(t => !t.completed).length} icon={CheckSquare} />
          <MiniStat label="Tasques vençudes" value={overdueTasks} icon={Clock} alert={overdueTasks > 0} />
          <MiniStat label="MRR" value={formatEuro(mrr)} icon={Receipt} />
        </div>
      </div>

      <Tabs defaultValue="leads">
        <TabsList className="bg-slate-100 mb-4 flex-wrap h-auto">
          <TabsTrigger value="leads">Leads / Clients ({projectLeads.length})</TabsTrigger>
          <TabsTrigger value="finance">Finances</TabsTrigger>
          <TabsTrigger value="tasks">Tasques</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {projectLeads.length === 0 && (
              <div className="p-8 text-center text-slate-400">No hi ha leads en aquest projecte</div>
            )}
            {projectLeads.map(lead => (
              <LeadRow key={lead.id} lead={lead} projects={[]} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-5">
          {/* Accepted proposals */}
          {acceptedProposals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-semibold text-slate-500">Propostes acceptades</h3>
              {acceptedProposals.map(p => (
                <div key={p.id} className="bg-white border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{p.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{p.notes}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">
                      {proposalStatusLabels[p.status] || p.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-slate-600">
                    <span>Setup: <strong>{formatEuro(p.setup_fee)}</strong></span>
                    <span>Mensual: <strong>{formatEuro(p.monthly_fee)}</strong></span>
                    <span>Anual: <strong>{formatEuro(p.annual_value)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invoices */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-semibold text-slate-500">Factures ({invoices.length})</h3>
            {invoices.length === 0 && <p className="text-sm text-slate-400">No hi ha factures.</p>}
            {invoices.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left p-3">Núm.</th>
                      <th className="text-left p-3">Emissió</th>
                      <th className="text-left p-3">Venciment</th>
                      <th className="text-left p-3">Concepte</th>
                      <th className="text-right p-3">Total</th>
                      <th className="p-3">Estat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-t border-slate-100">
                        <td className="p-3 font-medium">{inv.number}</td>
                        <td className="p-3 text-slate-600">{inv.issue_date || '-'}</td>
                        <td className={`p-3 ${inv.due_date && inv.due_date < today && inv.status !== 'paid' ? 'text-red-600 font-medium' : 'text-slate-600'}`}>{inv.due_date || '-'}</td>
                        <td className="p-3 text-slate-700 truncate max-w-[160px]">{inv.concept || '-'}</td>
                        <td className="p-3 text-right">{formatEuro(inv.total_amount)}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${invoiceStatusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                            {invoiceStatusLabels[inv.status] || inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-semibold text-slate-500">Pagaments recurrents ({recurring.length})</h3>
            {recurring.length === 0 && <p className="text-sm text-slate-400">No hi ha pagaments recurrents.</p>}
            {recurring.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{r.description}</p>
                  <p className="text-xs text-slate-500">{freqLabels[r.frequency] || r.frequency} · Inici: {r.start_date || '-'} · Pròxim: {r.next_billing_date || '-'}</p>
                  {r.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-800">{formatEuro(r.amount)}/mes</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${recurringStatusColors[r.status] || 'bg-slate-100 text-slate-500'}`}>
                    {r.status === 'active' ? 'Actiu' : r.status === 'paused' ? 'Pausat' : 'Cancel·lat'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {projectTasks.length === 0 && (
              <div className="p-8 text-center text-slate-400">No hi ha tasques en aquest projecte</div>
            )}
            {projectTasks.map(task => (
              <TaskRow key={task.id} task={task} leads={projectLeads} projects={[]} />
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