import React, { useState, useEffect } from 'react';
import { useProjects } from '../components/shared/useAppData';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Phone, Mail, Globe, Flame, AlertTriangle, Clock, CheckCircle, FileText, Send, Plus, Edit } from 'lucide-react';
import { pipelineLabels, pipelineColors, temperatureColors, priorityColors, isOverdue, scoreLead } from '../lib/crmUtils';
import EmailDraftModal from '../components/leads/EmailDraftModal';
import ProposalModal from '../components/leads/ProposalModal';
import LogActivityModal from '../components/leads/LogActivityModal';
import EditLeadModal from '../components/leads/EditLeadModal';

export default function LeadDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [emails, setEmails] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showEmail, setShowEmail] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = async () => {
    if (!leadId) return;
    setLoading(true);
    const [l, acts, tsks, em, props] = await Promise.all([
      base44.entities.Lead.filter({ id: leadId }),
      base44.entities.Activity.filter({ lead_id: leadId }, '-created_date', 50),
      base44.entities.Task.filter({ lead_id: leadId }, '-created_date', 50),
      base44.entities.EmailDraft.filter({ lead_id: leadId }, '-created_date', 20),
      base44.entities.Proposal.filter({ lead_id: leadId }, '-created_date', 10),
    ]);
    setLead(l[0] || null);
    setActivities(acts);
    setTasks(tsks);
    setEmails(em);
    setProposals(props);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leadId]);

  const markWon = async () => {
    await base44.entities.Lead.update(leadId, { pipeline_status: 'ganado', lifecycle_stage: 'customer' });
    await load();
  };

  const markLost = async () => {
    await base44.entities.Lead.update(leadId, { pipeline_status: 'perdido', lifecycle_stage: 'lost' });
    await load();
  };

  const completeTask = async (taskId) => {
    await base44.entities.Task.update(taskId, { completed: true, completed_date: format(new Date(), 'yyyy-MM-dd') });
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center text-slate-400">
        Lead no trobat. <Link to="/Leads" className="text-blue-500 underline">Tornar als leads</Link>
      </div>
    );
  }

  const project = projects.find(p => p.id === lead.project_id);
  const temp = temperatureColors[lead.temperature] || temperatureColors.frio;
  const prio = priorityColors[lead.priority] || priorityColors.media;
  const overdue = isOverdue(lead);
  const score = scoreLead(lead);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link to="/Leads" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{lead.name || lead.company}</h1>
          {lead.company && lead.name !== lead.company && (
            <p className="text-sm text-slate-500">{lead.company}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowEdit(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Edit className="w-4 h-4 text-slate-500" />
          </button>
          {project && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${project.color}20`, color: project.color }}>
              {project.name}
            </span>
          )}
        </div>
      </div>

      {/* Status row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold px-3 py-1 rounded-full text-white"
          style={{ backgroundColor: pipelineColors[lead.pipeline_status] || '#94a3b8' }}>
          {pipelineLabels[lead.pipeline_status] || lead.pipeline_status}
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${temp.bg} ${temp.text}`}>{temp.label}</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${prio.bg} ${prio.text}`}>{prio.label} prioritat</span>
        {overdue && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Acció vençuda
          </span>
        )}
        <span className="text-xs text-slate-400 ml-auto">Score: {score}</span>
      </div>

      {/* Quick contact */}
      <div className="flex gap-2 flex-wrap">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
            <Phone className="w-3.5 h-3.5 text-emerald-600" /> {lead.phone}
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
            <Mail className="w-3.5 h-3.5 text-blue-600" /> {lead.email}
          </a>
        )}
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
            <Globe className="w-3.5 h-3.5 text-slate-500" /> Web
          </a>
        )}
      </div>

      {/* Action bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowActivity(true)} className="text-xs h-8">
          <Plus className="w-3.5 h-3.5 mr-1" /> Log activitat
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowEmail(true)} className="text-xs h-8">
          <Mail className="w-3.5 h-3.5 mr-1" /> Generar email
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowProposal(true)} className="text-xs h-8">
          <FileText className="w-3.5 h-3.5 mr-1" /> Generar proposta
        </Button>
        <div className="ml-auto flex gap-2">
          {lead.pipeline_status !== 'ganado' && (
            <Button size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700" onClick={markWon}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Guanyat
            </Button>
          )}
          {lead.pipeline_status !== 'perdido' && (
            <Button size="sm" variant="outline" className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={markLost}>
              Perdut
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Resum</TabsTrigger>
          <TabsTrigger value="activities">Activitat ({activities.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasques ({tasks.length})</TabsTrigger>
          <TabsTrigger value="emails">Emails ({emails.length})</TabsTrigger>
          <TabsTrigger value="proposals">Propostes ({proposals.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Next action */}
          {(lead.next_action || lead.next_action_date) && (
            <div className={`rounded-xl p-4 border ${overdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pròxima acció</p>
              <p className="text-sm font-medium text-slate-900">{lead.next_action || lead.best_next_action}</p>
              {lead.next_action_date && (
                <p className={`text-xs mt-1 font-medium ${overdue ? 'text-red-600' : 'text-amber-700'}`}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {format(new Date(lead.next_action_date), "d 'de' MMMM yyyy", { locale: es })}
                  {overdue && ' — VENÇUDA'}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CRM fields */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Informació comercial</h3>
              {lead.current_result && <Field label="Resultat actual" value={lead.current_result} />}
              {lead.key_objection && <Field label="Objecció clau" value={lead.key_objection} />}
              {lead.recommended_response && <Field label="Resposta recomanada" value={lead.recommended_response} />}
              {lead.offer_angle && <Field label="Angle d'oferta" value={lead.offer_angle} />}
              {lead.today_action && <Field label="Acció avui" value={lead.today_action} highlight />}
              {lead.best_next_action && <Field label="Millor pròxima acció" value={lead.best_next_action} />}
            </div>

            {/* Commercial value */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Valor comercial</h3>
              {lead.probability != null && <Field label="Probabilitat" value={`${lead.probability}%`} />}
              {lead.setup_fee != null && <Field label="Setup" value={`€${lead.setup_fee}`} />}
              {lead.monthly_fee != null && <Field label="Quota mensual" value={`€${lead.monthly_fee}/mes`} />}
              {lead.annual_value != null && <Field label="Valor anual" value={`€${lead.annual_value}`} />}
              {lead.weighted_value != null && <Field label="Valor ponderat" value={`€${lead.weighted_value}`} />}
              {lead.forecast_90_days != null && <Field label="Forecast 90 dies" value={`€${lead.forecast_90_days}`} />}
              {lead.demo_date && <Field label="Data demo" value={format(new Date(lead.demo_date), "d MMM yyyy", { locale: es })} />}
              {lead.proposal_date && <Field label="Data proposta" value={format(new Date(lead.proposal_date), "d MMM yyyy", { locale: es })} />}
              {lead.closing_date && <Field label="Data tancament" value={format(new Date(lead.closing_date), "d MMM yyyy", { locale: es })} />}
            </div>

            {/* Contact */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contacte</h3>
              {lead.owner && <Field label="Responsable" value={lead.owner} />}
              {lead.decision_maker && <Field label="Decisor" value={lead.decision_maker} />}
              {lead.zone && <Field label="Zona" value={lead.zone} />}
              {lead.municipality && <Field label="Municipi" value={lead.municipality} />}
              {lead.last_contact && <Field label="Últim contacte" value={format(new Date(lead.last_contact), "d MMM yyyy", { locale: es })} />}
              {lead.days_without_activity != null && (
                <Field label="Dies sense activitat" value={`${lead.days_without_activity} dies`}
                  alert={lead.days_without_activity > 14} />
              )}
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notes</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ACTIVITIES */}
        <TabsContent value="activities" className="mt-4">
          <div className="space-y-3">
            <Button size="sm" variant="outline" onClick={() => setShowActivity(true)} className="w-full text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Registrar nova activitat
            </Button>
            {activities.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                Sense activitats registrades
              </div>
            )}
            {activities.map(act => (
              <div key={act.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{act.type}</span>
                  <span className="text-xs text-slate-400">{act.date ? format(new Date(act.date), "d MMM yyyy", { locale: es }) : ''}</span>
                </div>
                {act.subject && <p className="text-sm font-medium text-slate-900">{act.subject}</p>}
                {act.summary && <p className="text-sm text-slate-600 mt-1">{act.summary}</p>}
                {act.outcome && <p className="text-xs text-emerald-700 mt-1 font-medium">Resultat: {act.outcome}</p>}
                {act.next_action && <p className="text-xs text-amber-700 mt-1">Pròxim pas: {act.next_action}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="mt-4">
          <div className="space-y-3">
            {tasks.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                Sense tasques assignades
              </div>
            )}
            {tasks.map(task => (
              <div key={task.id} className={`bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 ${task.completed ? 'opacity-50' : ''}`}>
                <button onClick={() => !task.completed && completeTask(task.id)} className="mt-0.5">
                  <CheckCircle className={`w-5 h-5 ${task.completed ? 'text-emerald-500' : 'text-slate-200 hover:text-slate-400'} transition-colors`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(new Date(task.due_date), "d MMM", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* EMAILS */}
        <TabsContent value="emails" className="mt-4">
          <div className="space-y-3">
            <Button size="sm" variant="outline" onClick={() => setShowEmail(true)} className="w-full text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Generar nou email
            </Button>
            {emails.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                Sense esborranys d'email
              </div>
            )}
            {emails.map(email => (
              <div key={email.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{email.template_type?.replace(/_/g, ' ')}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${email.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {email.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">{email.subject}</p>
                <p className="text-xs text-slate-500 line-clamp-3">{email.body}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`)}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Copiar email
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* PROPOSALS */}
        <TabsContent value="proposals" className="mt-4">
          <div className="space-y-3">
            <Button size="sm" variant="outline" onClick={() => setShowProposal(true)} className="w-full text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Generar nova proposta
            </Button>
            {proposals.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                Sense propostes generades
              </div>
            )}
            {proposals.map(prop => (
              <div key={prop.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-900">{prop.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    prop.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                    prop.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'}`}>
                    {prop.status}
                  </span>
                </div>
                {prop.summary && <p className="text-xs text-slate-600">{prop.summary}</p>}
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  {prop.setup_fee && <span>Setup: €{prop.setup_fee}</span>}
                  {prop.monthly_fee && <span>Mensual: €{prop.monthly_fee}</span>}
                  {prop.annual_value && <span>Anual: €{prop.annual_value}</span>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showEmail && <EmailDraftModal lead={lead} project={project} onClose={() => { setShowEmail(false); load(); }} />}
      {showProposal && <ProposalModal lead={lead} project={project} onClose={() => { setShowProposal(false); load(); }} />}
      {showActivity && <LogActivityModal lead={lead} onClose={() => { setShowActivity(false); load(); }} />}
      {showEdit && <EditLeadModal lead={lead} onClose={() => { setShowEdit(false); load(); }} />}
    </div>
  );
}

function Field({ label, value, highlight, alert }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-sm mt-0.5 ${highlight ? 'font-semibold text-amber-800' : alert ? 'text-red-600 font-medium' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}