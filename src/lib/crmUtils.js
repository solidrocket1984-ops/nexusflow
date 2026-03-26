import { format, isAfter, isBefore, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';

export const today = () => format(new Date(), 'yyyy-MM-dd');

export function scoreLead(lead) {
  const t = today();
  let score = 0;
  if (lead.next_action_date && lead.next_action_date < t) score += 100;
  if (lead.next_action_date === t) score += 80;
  if (lead.today_action) score += 60;
  if (lead.temperature === 'caliente') score += 50;
  if (lead.priority === 'alta') score += 40;
  if (lead.urgency === 'alta' || lead.urgency === 'urgent' || lead.urgency === 'urgente') score += 35;
  if (lead.proposal_status === 'sent') score += 30;
  if ((lead.days_without_activity || 0) > 30) score += 25;
  if ((lead.days_without_activity || 0) > 14) score += 20;
  if (!lead.next_action && lead.last_contact) score += 20;
  if ((lead.probability || 0) >= 70) score += 20;
  if ((lead.weighted_value || 0) > 1000) score += 15;
  return score;
}

export function isOverdue(lead) {
  const t = today();
  return lead.next_action_date && lead.next_action_date < t;
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

export function generateSuggestionsFromLeads(leads) {
  const t = today();
  const suggestions = [];

  leads.filter(isActiveInPipeline).forEach(lead => {
    const score = scoreLead(lead);
    if (score === 0) return;

    let type = 'seguimiento';
    let reason = '';
    let cta = 'Fer seguiment';

    if (lead.next_action_date && lead.next_action_date < t) {
      type = 'llamar';
      reason = `Acció vençuda: ${lead.next_action || 'Seguiment pendent'}`;
      cta = 'Contactar ara';
    } else if (lead.today_action) {
      type = 'seguimiento';
      reason = lead.today_action;
      cta = 'Executar avui';
    } else if (lead.temperature === 'caliente') {
      type = 'llamar';
      reason = `Lead calent sense acció definida`;
      cta = 'Trucar ara';
    } else if (lead.proposal_status === 'sent') {
      type = 'follow_up';
      reason = `Proposta enviada sense resposta`;
      cta = 'Fer follow-up';
    } else if ((lead.days_without_activity || 0) > 30) {
      type = 'reactivar_proyecto';
      reason = `${lead.days_without_activity} dies sense activitat — reactivar`;
      cta = 'Reactivar';
    } else if (lead.best_next_action) {
      reason = lead.best_next_action;
      cta = 'Executar';
    } else {
      reason = lead.next_action || 'Seguiment recomanat';
    }

    suggestions.push({
      id: lead.id,
      lead_id: lead.id,
      lead,
      project_id: lead.project_id,
      type,
      reason,
      cta,
      score,
      priority: score >= 80 ? 'alta' : score >= 40 ? 'media' : 'baja',
    });
  });

  return suggestions.sort((a, b) => b.score - a.score);
}

export function getTaskBucket(task) {
  const t = today();
  if (!task.due_date) return 'backlog';
  if (task.due_date < t) return 'overdue';
  if (task.due_date === t) return 'today';
  const endWeek = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  if (task.due_date <= endWeek) return 'this_week';
  const endMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  if (task.due_date <= endMonth) return 'this_month';
  return 'backlog';
}

export function normalizeStatus(val) {
  if (!val) return null;
  const v = String(val).toLowerCase().trim();
  const map = {
    'nou': 'nuevo', 'new': 'nuevo', 'nuevo': 'nuevo',
    'contactat': 'contactado', 'contactado': 'contactado',
    'pendent resposta': 'pendiente_respuesta', 'pendiente respuesta': 'pendiente_respuesta',
    'reunió agendada': 'reunion_agendada', 'reunion agendada': 'reunion_agendada',
    'proposta enviada': 'propuesta_enviada', 'propuesta enviada': 'propuesta_enviada',
    'negociació': 'negociacion', 'negociación': 'negociacion',
    'guanyat': 'ganado', 'ganado': 'ganado', 'won': 'ganado',
    'perdut': 'perdido', 'perdido': 'perdido', 'lost': 'perdido',
  };
  return map[v] || val;
}

export function generateDuplicateKey(lead) {
  const parts = [
    (lead.email || '').toLowerCase().trim(),
    (lead.phone || '').replace(/\s/g, '').trim(),
    (lead.company || lead.name || '').toLowerCase().trim(),
  ];
  return parts.join('|');
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