import { addDays, format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { ENLLAC_PROJECT_ID, isHot, isOverdue, normalizeLead } from '@/lib/crmUtils';

const AUTOMATION_WINDOW_DAYS = 3;

function existsTask(tasks, leadId, reasonCode) {
  return tasks.some((task) => !task.completed && task.lead_id === leadId && task.reason_code === reasonCode);
}

function buildTaskReason(reasonCode, lead) {
  const reasons = {
    due_next_action: `Acció pendent (${lead.next_action || 'Seguiment'}) arribada o vençuda`,
    proposal_followup: 'Proposta enviada: cal seguiment automàtic',
    email_followup: 'Correu enviat: seguiment automàtic',
    hot_no_action: 'Lead calent sense pròxima acció',
    reactivation: 'Lead inactiu: reactivació recomanada',
    initial_qualification: 'Lead nou sense pas inicial',
  };
  return reasons[reasonCode] || 'Regla automàtica CRM';
}

function createAutomaticTask(base) {
  return base44.entities.Task.create({
    ...base,
    source: 'crm_rule',
    completed: false,
    origin: 'automatic',
    project_id: base.project_id || ENLLAC_PROJECT_ID,
  });
}

export async function runAutomaticTaskRules(leads = [], tasks = []) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const created = [];

  for (const rawLead of leads) {
    const lead = normalizeLead(rawLead);

    if (lead.next_action && lead.next_action_date && lead.next_action_date <= today && !existsTask(tasks, lead.id, 'due_next_action')) {
      created.push(createAutomaticTask({
        title: lead.next_action,
        description: `Acció següent del lead: ${lead.next_action_date}`,
        lead_id: lead.id,
        type: 'seguimiento',
        priority: lead.priority || 'media',
        urgency: lead.urgency || 'media',
        due_date: lead.next_action_date,
        reason_code: 'due_next_action',
        reason: buildTaskReason('due_next_action', lead),
      }));
    }

    if (lead.proposal_status === 'sent' && !existsTask(tasks, lead.id, 'proposal_followup')) {
      created.push(createAutomaticTask({
        title: 'Fer seguiment de proposta enviada',
        lead_id: lead.id,
        type: 'proposal_send',
        priority: 'alta',
        urgency: lead.urgency || 'media',
        due_date: format(addDays(new Date(), AUTOMATION_WINDOW_DAYS), 'yyyy-MM-dd'),
        reason_code: 'proposal_followup',
        reason: buildTaskReason('proposal_followup', lead),
      }));
    }

    if (lead.email_status === 'sent' && !existsTask(tasks, lead.id, 'email_followup')) {
      created.push(createAutomaticTask({
        title: 'Fer seguiment de correu enviat',
        lead_id: lead.id,
        type: 'email',
        priority: 'media',
        urgency: lead.urgency || 'media',
        due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        reason_code: 'email_followup',
        reason: buildTaskReason('email_followup', lead),
      }));
    }

    if (isHot(lead) && !lead.next_action_date && !existsTask(tasks, lead.id, 'hot_no_action')) {
      created.push(createAutomaticTask({
        title: 'Definir acció immediata per lead calent',
        lead_id: lead.id,
        type: 'call',
        priority: 'alta',
        urgency: 'alta',
        due_date: today,
        reason_code: 'hot_no_action',
        reason: buildTaskReason('hot_no_action', lead),
      }));
    }

    if ((lead.days_without_activity || 0) >= 21 && !existsTask(tasks, lead.id, 'reactivation')) {
      created.push(createAutomaticTask({
        title: 'Reactivar lead inactiu',
        lead_id: lead.id,
        type: 'seguimiento',
        priority: 'media',
        urgency: 'media',
        due_date: today,
        reason_code: 'reactivation',
        reason: buildTaskReason('reactivation', lead),
      }));
    }

    if (!lead.next_action && !existsTask(tasks, lead.id, 'initial_qualification') && !isOverdue(lead)) {
      created.push(createAutomaticTask({
        title: 'Qualificació inicial del lead',
        lead_id: lead.id,
        type: 'admin',
        priority: 'media',
        urgency: 'baja',
        due_date: today,
        reason_code: 'initial_qualification',
        reason: buildTaskReason('initial_qualification', lead),
      }));
    }
  }

  if (created.length) {
    await Promise.all(created);
  }

  return created.length;
}
