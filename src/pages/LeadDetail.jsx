import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone, Globe, Plus, CheckCircle, Archive, FileText, Eye, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { pipelineColors, pipelineLabels, priorityColors, temperatureColors, normalizeLead } from '../lib/crmUtils';
import { PROPOSAL_STATUS_LABELS } from '@/lib/proposalUtils';
import EmailDraftModal from '../components/leads/EmailDraftModal';
import ProposalModal from '../components/leads/ProposalModal';
import LogActivityModal from '../components/leads/LogActivityModal';
import EditLeadModal from '../components/leads/EditLeadModal';

export default function LeadDetail() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const leadId = params.get('id');
  const initialTab = params.get('tab') || 'overview';

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(initialTab);
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [emails, setEmails] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [showEmail, setShowEmail] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = async () => {
    if (!leadId) return;
    setLoading(true);
    const [leadData, activityData, taskData, emailData, proposalData] = await Promise.all([
      base44.entities.Lead.filter({ id: leadId }),
      base44.entities.Activity.filter({ lead_id: leadId }, '-activity_date', 100),
      base44.entities.Task.filter({ lead_id: leadId }, '-created_date', 100),
      base44.entities.EmailDraft.filter({ lead_id: leadId }, '-created_date', 100),
      base44.entities.Proposal.filter({ lead_id: leadId }, '-created_date', 100),
    ]);
    setLead(normalizeLead(leadData[0] || null));
    setActivities(activityData);
    setTasks(taskData);
    setEmails(emailData);
    setProposals(proposalData);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leadId]);

  const stickyActions = useMemo(() => ([
    { label: 'Registrar activitat', onClick: () => setShowActivity(true) },
    { label: 'Email', onClick: () => setShowEmail(true) },
    { label: 'Crear proposta', onClick: () => { setEditingProposal(null); setShowProposal(true); } },
    { label: 'Editar lead', onClick: () => setShowEdit(true) },
  ]), []);

  const updateLead = async (payload) => {
    await base44.entities.Lead.update(lead.id, payload);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    load();
  };

  const createActivity = async (subject, summary) => {
    await base44.entities.Activity.create({
      lead_id: lead.id,
      type: 'stage_change',
      subject,
      summary,
      activity_date: new Date().toISOString(),
      auto_generated: true,
    });
  };

  const markWon = async () => {
    await updateLead({ pipeline_status: 'ganado', lifecycle_stage: 'customer', lead_status: 'won', closing_date: format(new Date(), 'yyyy-MM-dd') });
    await createActivity('Lead marcat com guanyat', 'Canvi d\'estat comercial a guanyat.');
  };

  const markLost = async () => {
    const reason = window.prompt('Motiu de pèrdua (opcional):');
    await updateLead({ pipeline_status: 'perdido', lifecycle_stage: 'lost', lead_status: 'lost' });
    await createActivity('Lead marcat com perdut', reason || 'Sense motiu especificat');
  };

  const markEmailSent = async (email) => {
    const date = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.EmailDraft.update(email.id, { status: 'sent' });
    await updateLead({ last_email_date: date, last_activity_date: date, email_status: 'sent', last_contact: date });
    await base44.entities.Activity.create({ lead_id: lead.id, type: 'email', subject: `Email enviat: ${email.subject}`, summary: 'Email marcat com enviat', activity_date: new Date().toISOString(), auto_generated: true });
    load();
  };

  const updateProposalStatus = async (proposal, status) => {
    const date = format(new Date(), 'yyyy-MM-dd');
    const proposalPayload = { status };
    const leadPayload = { proposal_status: status };

    if (status === 'ready') {
      leadPayload.proposal_date = lead.proposal_date || date;
    }
    if (status === 'sent') {
      proposalPayload.sent_date = proposal.sent_date || date;
      leadPayload.proposal_date = lead.proposal_date || date;
      leadPayload.pipeline_status = 'propuesta_enviada';
      await base44.entities.Task.create({
        title: `Follow-up proposta: ${proposal.title}`,
        lead_id: lead.id,
        project_id: lead.project_id,
        due_date: format(new Date(Date.now() + 5 * 86400000), 'yyyy-MM-dd'),
        type: 'propuesta',
        priority: 'alta',
        source: 'crm_rule',
        completed: false,
      });
    }
    if (status === 'accepted') Object.assign(leadPayload, { lifecycle_stage: 'customer', pipeline_status: 'ganado', lead_status: 'won' });
    if (status === 'rejected') {
      const note = window.prompt('Nota de rebuig (opcional):') || 'Proposta rebutjada';
      proposalPayload.notes = [proposal.notes, note].filter(Boolean).join('\n');
    }

    await base44.entities.Proposal.update(proposal.id, proposalPayload);
    await updateLead(leadPayload);
    await base44.entities.Activity.create({ lead_id: lead.id, type: 'proposal', subject: `Proposta ${PROPOSAL_STATUS_LABELS[status]?.toLowerCase() || status}`, summary: proposal.title, activity_date: new Date().toISOString(), auto_generated: true });
    load();
  };

  const archiveLead = async () => {
    await updateLead({ is_archived: true, archive_reason: 'manual_archive' });
    await createActivity('Lead arxivat', 'Arxiu manual des de fitxa de lead');
  };

  if (loading) return <div className="h-64 flex items-center justify-center">Carregant...</div>;
  if (!lead) return <div className="p-8 text-center text-slate-500">Lead no trobat</div>;

  const temp = temperatureColors[lead.temperature] || temperatureColors.frio;
  const priority = priorityColors[lead.priority] || priorityColors.media;

  const timeline = [...activities.map((a) => ({ ...a, _type: 'activity', _date: a.activity_date || a.created_date })), ...emails.map((e) => ({ ...e, _type: 'email', _date: e.generated_date || e.created_date })), ...proposals.map((p) => ({ ...p, _type: 'proposal', _date: p.sent_date || p.created_date }))]
    .sort((a, b) => String(b._date || '').localeCompare(String(a._date || '')));

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <Link to="/Leads" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900 truncate">{lead.contact_name || lead.name || lead.company}</h1>
          <p className="text-sm text-slate-500">{lead.company} · {lead.owner || 'Sense responsable'}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={markWon}><CheckCircle className="w-4 h-4 mr-1" />Guanyat</Button>
          <Button size="sm" variant="outline" onClick={markLost}>Perdut</Button>
          <Button size="sm" variant="outline" onClick={archiveLead}><Archive className="w-4 h-4 mr-1" />Arxivar</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold px-2 py-1 rounded-full text-white" style={{ backgroundColor: pipelineColors[lead.pipeline_status] || '#64748b' }}>{pipelineLabels[lead.pipeline_status] || lead.pipeline_status}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${temp.bg} ${temp.text}`}>{temp.label}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${priority.bg} ${priority.text}`}>{priority.label}</span>
        {lead.proposal_status && lead.proposal_status !== 'none' && <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Proposta: {PROPOSAL_STATUS_LABELS[lead.proposal_status] || lead.proposal_status}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InfoCard icon={<Mail className="w-4 h-4" />} label="Email" value={lead.email || '-'} link={lead.email ? `mailto:${lead.email}` : undefined} />
        <InfoCard icon={<Phone className="w-4 h-4" />} label="Telèfon" value={lead.phone || '-'} link={lead.phone ? `tel:${lead.phone}` : undefined} />
        <InfoCard icon={<Globe className="w-4 h-4" />} label="Web" value={lead.website || '-'} link={lead.website || undefined} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100 flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="tasks">Tasques</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="proposals">Propostes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 pt-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Pipeline stage" value={lead.pipeline_status} />
            <Field label="Lead status" value={lead.lead_status} />
            <Field label="Lifecycle" value={lead.lifecycle_stage} />
            <Field label="Proposal status" value={lead.proposal_status || 'none'} />
            <Field label="Proposal date" value={lead.proposal_date || '-'} />
            <Field label="Key objection" value={lead.key_objection || '-'} />
            <Field label="Recommended response" value={lead.recommended_response || '-'} />
            <Field label="Offer angle" value={lead.offer_angle || '-'} />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase">Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{lead.notes || 'Sense notes'}</p>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-2 pt-3">
          <Button size="sm" onClick={() => setShowActivity(true)}><Plus className="w-4 h-4 mr-1" />Registrar activitat</Button>
          {activities.map((activity) => <ActivityCard key={activity.id} item={activity} />)}
          {activities.length === 0 && <Empty text="Encara no hi ha activitat." />}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2 pt-3">
          {tasks.map((task) => <ActivityCard key={task.id} item={{ type: task.type, subject: task.title, summary: `${task.due_date || 'sense data'} · ${task.completed ? 'completada' : 'pendent'}`, activity_date: task.due_date }} />)}
          {tasks.length === 0 && <Empty text="No hi ha tasques vinculades." />}
        </TabsContent>

        <TabsContent value="emails" className="space-y-2 pt-3">
          <Button size="sm" onClick={() => setShowEmail(true)}><Mail className="w-4 h-4 mr-1" />Generar email</Button>
          {emails.map((email) => (
            <div key={email.id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{email.subject}</p>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{email.status}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{email.body}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`)} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Copiar</button>
                {email.status !== 'sent' && <button onClick={() => markEmailSent(email)} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Marcar enviat</button>}
              </div>
            </div>
          ))}
          {emails.length === 0 && <Empty text="Sense drafts d'email." />}
        </TabsContent>

        <TabsContent value="proposals" className="space-y-2 pt-3">
          <Button size="sm" onClick={() => { setEditingProposal(null); setShowProposal(true); }}><FileText className="w-4 h-4 mr-1" />Crear proposta</Button>
          {proposals.map((proposal) => (
            <div key={proposal.id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex justify-between">
                <p className="text-sm font-semibold text-slate-900">{proposal.title}</p>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{proposal.summary || proposal.plantejament}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={() => { setEditingProposal(proposal); setShowProposal(true); }} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50 inline-flex items-center"><Pencil className="w-3 h-3 mr-1" />Editar</button>
                <button onClick={() => { setEditingProposal(proposal); setShowProposal(true); }} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50 inline-flex items-center"><Eye className="w-3 h-3 mr-1" />Vista prèvia</button>
                {proposal.status !== 'ready' && <button onClick={() => updateProposalStatus(proposal, 'ready')} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Marcar com preparada</button>}
                {proposal.status !== 'sent' && <button onClick={() => updateProposalStatus(proposal, 'sent')} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Marcar com enviada</button>}
                {proposal.status !== 'accepted' && <button onClick={() => updateProposalStatus(proposal, 'accepted')} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Marcar com acceptada</button>}
                {proposal.status !== 'rejected' && <button onClick={() => updateProposalStatus(proposal, 'rejected')} className="text-xs px-2 py-1 border rounded border-slate-200 hover:bg-slate-50">Marcar com rebutjada</button>}
              </div>
            </div>
          ))}
          {proposals.length === 0 && <Empty text="Sense propostes." />}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-2 pt-3">
          {timeline.map((item, idx) => <ActivityCard key={`${item.id}-${idx}`} item={{ type: item._type, subject: item.subject || item.title || 'Event', summary: item.summary || item.status || '', activity_date: item._date }} />)}
          {timeline.length === 0 && <Empty text="Timeline buida." />}
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 p-2 z-30">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-auto">
          {stickyActions.map((action) => (
            <button key={action.label} onClick={action.onClick} className="text-xs px-3 py-2 rounded-lg border border-slate-200 whitespace-nowrap hover:bg-slate-50">{action.label}</button>
          ))}
        </div>
      </div>

      {showEmail && <EmailDraftModal lead={lead} onClose={() => { setShowEmail(false); load(); }} />}
      {showProposal && <ProposalModal lead={lead} proposal={editingProposal} onClose={() => { setShowProposal(false); setEditingProposal(null); load(); }} />}
      {showActivity && <LogActivityModal lead={lead} onClose={() => { setShowActivity(false); load(); }} />}
      {showEdit && <EditLeadModal lead={lead} onClose={() => { setShowEdit(false); load(); }} />}
    </div>
  );
}

function InfoCard({ icon, label, value, link }) {
  const content = <div className="bg-white border border-slate-200 rounded-xl p-3"><p className="text-xs text-slate-500 flex items-center gap-1">{icon}{label}</p><p className="text-sm text-slate-800 mt-1 truncate">{value}</p></div>;
  return link ? <a href={link} target={link.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{content}</a> : content;
}

function Field({ label, value }) {
  return <div><p className="text-[10px] uppercase text-slate-500">{label}</p><p className="text-sm text-slate-800 mt-0.5">{value}</p></div>;
}

function ActivityCard({ item }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <p className="text-xs text-slate-500">{item.type} · {item.activity_date ? String(item.activity_date).slice(0, 10) : '-'}</p>
      <p className="text-sm font-medium text-slate-900">{item.subject || '-'}</p>
      {item.summary && <p className="text-xs text-slate-600 mt-1">{item.summary}</p>}
    </div>
  );
}

function Empty({ text }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">{text}</div>;
}
