import { addDays, endOfMonth, endOfWeek, format, isValid, parseISO } from 'date-fns';

export const ENLLAC_PROJECT_ID = 'enllac_digital';

export const today = () => format(new Date(), 'yyyy-MM-dd');

export function toDate(value) {
  if (!value) return null;
  const parsed = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(parsed) ? parsed : null;
}

export function dateDiffDays(fromDate, toDateValue = new Date()) {
  const from = toDate(fromDate);
  const to = toDate(toDateValue);
  if (!from || !to) return null;
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function normalizeLead(lead = {}) {
  const normalized = {
    ...lead,
    project_id: lead.project_id || ENLLAC_PROJECT_ID,
    company: lead.company || '',
    contact_name: lead.contact_name || lead.name || '',
    lead_status: lead.lead_status || 'active',
    lifecycle_stage: lead.lifecycle_stage || 'lead',
    priority: lead.priority || 'media',
    urgency: lead.urgency || 'media',
    pipeline_status: normalizeStatus(lead.pipeline_status) || 'nuevo',
  };

  normalized.duplicate_key = lead.duplicate_key || buildDuplicateKey(normalized);

  if (!normalized.last_activity_date) {
    normalized.last_activity_date = normalized.last_contact || normalized.last_email_date || normalized.last_call_date || null;
  }

  if (normalized.days_without_activity == null) {
    normalized.days_without_activity = normalized.last_activity_date ? dateDiffDays(normalized.last_activity_date) : 999;
  }

  if (normalized.weighted_value == null) {
    const annual = Number(normalized.annual_value || 0);
    const probability = Number(normalized.probability || 0) / 100;
    normalized.weighted_value = Math.round(annual * probability);
  }

  return normalized;
}

export function scoreLead(inputLead) {
  const lead = normalizeLead(inputLead);
  const t = today();
  let score = 0;

  if (isOverdue(lead)) score += 100;
  if (lead.next_action_date === t) score += 65;
  if (lead.temperature === 'caliente') score += 50;
  if (lead.priority === 'alta') score += 35;
  if (lead.urgency === 'alta' || lead.urgency === 'urgent' || lead.urgency === 'urgente') score += 35;
  if (lead.proposal_status === 'sent') score += 28;
  if ((lead.days_without_activity || 0) > 30) score += 24;
  else if ((lead.days_without_activity || 0) > 14) score += 16;
  if (!lead.next_action && lead.last_contact) score += 14;
  if ((lead.probability || 0) >= 70) score += 20;
  if ((lead.weighted_value || 0) > 3000) score += 15;
  if ((lead.weighted_value || 0) > 9000) score += 15;

  return score;
}

export function isOverdue(lead) {
  const t = today();
  return !!(lead.next_action_date && lead.next_action_date < t && !lead.is_archived && lead.pipeline_status !== 'ganado' && lead.pipeline_status !== 'perdido');
}

export function isDueToday(lead) {
  return lead.next_action_date === today();
}

export function isDueThisWeek(lead) {
  const t = today();
  const nxt = lead.next_action_date;
  if (!nxt) return false;
  const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return nxt >= t && nxt <= end;
}

export function isInactive(lead, days = 14) {
  return (lead.days_without_activity || 0) >= days;
}

export function isHot(lead) {
  return lead.temperature === 'caliente';
}

export function isActiveInPipeline(lead) {
  return lead.pipeline_status !== 'ganado' && lead.pipeline_status !== 'perdido' && !lead.is_archived;
}

export function getLeadPriorityBucket(lead) {
  const score = scoreLead(lead);
  if (score >= 110) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function getTimeBucket(dateValue) {
  if (!dateValue) return 'unscheduled';
  const d = format(toDate(dateValue) || new Date(dateValue), 'yyyy-MM-dd');
  const t = today();
  if (d < t) return 'overdue';
  if (d === t) return 'today';
  const endWeek = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  if (d <= endWeek) return 'this_week';
  const endMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  if (d <= endMonth) return 'this_month';
  return 'future';
}

export function getTaskBucket(task) {
  if (!task.due_date) return 'backlog';
  return getTimeBucket(task.due_date);
}

export function buildDuplicateKey(lead) {
  const parts = [
    (lead.email || '').toLowerCase().trim(),
    (lead.phone || '').replace(/\s/g, '').trim(),
    (lead.company || lead.name || '').toLowerCase().trim(),
  ];
  return parts.join('|');
}

export const generateDuplicateKey = buildDuplicateKey;

export function getStaleReason(lead) {
  if (!isActiveInPipeline(lead)) return null;
  const days = lead.days_without_activity || 0;
  if (days >= 45) return `${days} dies sense activitat`;
  if (!lead.next_action) return 'Sense pròxima acció definida';
  if (days >= 21) return `${days} dies sense contacte recent`;
  return null;
}

export function getDataQualityWarnings(lead) {
  const warnings = [];
  if (!lead.email && !lead.phone) warnings.push('Falten email i telèfon');
  if (!lead.next_action) warnings.push('Falta pròxima acció');
  if (!lead.pipeline_status || !lead.lead_status) warnings.push('Falta estat comercial');
  if (!lead.owner) warnings.push('Falta responsable');
  const staleReason = getStaleReason(lead);
  if (staleReason) warnings.push(staleReason);
  return warnings;
}

export function getLeadSuggestions(lead) {
  const suggestions = [];
  if (!isActiveInPipeline(lead)) return suggestions;

  if (isOverdue(lead)) {
    suggestions.push({
      type: 'overdue_follow_up',
      priority: 'alta',
      reason: `Seguiment vençut des de ${lead.next_action_date}`,
      cta: 'Contactar avui',
    });
  }

  if (isHot(lead) && !lead.next_action_date) {
    suggestions.push({
      type: 'hot_not_moved',
      priority: 'alta',
      reason: 'Lead calent sense data de pròxim pas',
      cta: 'Definir acció ara',
    });
  }

  const staleReason = getStaleReason(lead);
  if (staleReason) {
    suggestions.push({
      type: 'stale_reactivation',
      priority: 'media',
      reason: `Reactivació recomanada: ${staleReason}`,
      cta: 'Llançar reactivació',
    });
  }

  if (lead.proposal_status === 'sent') {
    suggestions.push({
      type: 'proposal_follow_up',
      priority: 'alta',
      reason: 'Proposta enviada pendent de resposta',
      cta: 'Fer follow-up de proposta',
    });
  }

  if (!lead.next_action && lead.last_contact) {
    suggestions.push({
      type: 'missing_next_step',
      priority: 'media',
      reason: 'Contacte recent sense següent pas definit',
      cta: 'Definir següent pas',
    });
  }

  return suggestions;
}

export function generateSuggestionsFromLeads(leads) {
  return leads
    .map(normalizeLead)
    .flatMap((lead) =>
      getLeadSuggestions(lead).map((suggestion, index) => ({
        id: `${lead.id}-${suggestion.type}-${index}`,
        lead_id: lead.id,
        lead,
        type: suggestion.type,
        reason: suggestion.reason,
        cta: suggestion.cta,
        score: scoreLead(lead),
        priority: suggestion.priority,
      }))
    )
    .sort((a, b) => b.score - a.score);
}

export function normalizeStatus(val) {
  if (!val) return null;
  const v = String(val).toLowerCase().trim();
  const map = {
    nou: 'nuevo',
    new: 'nuevo',
    nuevo: 'nuevo',
    contactat: 'contactado',
    contactado: 'contactado',
    'pendent resposta': 'pendiente_respuesta',
    'pendiente respuesta': 'pendiente_respuesta',
    'reunió agendada': 'reunion_agendada',
    'reunion agendada': 'reunion_agendada',
    'proposta enviada': 'propuesta_enviada',
    'propuesta enviada': 'propuesta_enviada',
    negociació: 'negociacion',
    negociación: 'negociacion',
    guanyat: 'ganado',
    ganado: 'ganado',
    won: 'ganado',
    perdut: 'perdido',
    perdido: 'perdido',
    lost: 'perdido',
  };
  return map[v] || val;
}

export const pipelineLabels = {
  nuevo: 'Nou',
  contactado: 'Contactat',
  pendiente_respuesta: 'Pend. resposta',
  reunion_agendada: 'Reunió agendada',
  propuesta_enviada: 'Proposta enviada',
  negociacion: 'Negociació',
  ganado: 'Guanyat',
  perdido: 'Perdut',
};

export const pipelineColors = {
  nuevo: '#94a3b8',
  contactado: '#60a5fa',
  pendiente_respuesta: '#fbbf24',
  reunion_agendada: '#a78bfa',
  propuesta_enviada: '#6366f1',
  negociacion: '#f97316',
  ganado: '#10b981',
  perdido: '#f87171',
};

export const temperatureColors = {
  frio: { bg: 'bg-blue-100', text: 'text-blue-700', label: '❄️ Fred' },
  templado: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🌤 Temperat' },
  caliente: { bg: 'bg-orange-100', text: 'text-orange-700', label: '🔥 Calent' },
};

export const priorityColors = {
  alta: { bg: 'bg-red-100', text: 'text-red-700', label: 'Alta' },
  media: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Mitja' },
  baja: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Baixa' },
};
