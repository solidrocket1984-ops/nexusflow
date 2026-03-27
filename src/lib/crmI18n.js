export const UI = {
  dashboard: 'Tauler',
  leads: 'Contactes / Leads',
  tasks: 'Tasques',
  suggestions: 'Suggeriments',
  agenda: 'Agenda',
  settings: 'Configuració',
  leadDetail: 'Detall del lead',
};

export const taskTypeLabels = {
  call: 'Trucar',
  llamada: 'Trucar',
  visit: 'Visita',
  seguimiento: 'Seguiment',
  follow_up: 'Seguiment',
  email: 'Correu',
  proposal_prepare: 'Preparar proposta',
  propuesta: 'Enviar proposta',
  proposal_send: 'Enviar proposta',
  meeting: 'Reunió',
  reunion: 'Reunió',
  admin: 'Admin',
  other: 'Altres',
  otro: 'Altres',
};

export const taskTypeOptions = [
  ['call', 'Trucar'],
  ['visit', 'Visita'],
  ['seguimiento', 'Seguiment'],
  ['email', 'Correu'],
  ['proposal_prepare', 'Preparar proposta'],
  ['proposal_send', 'Enviar proposta'],
  ['meeting', 'Reunió'],
  ['admin', 'Admin'],
  ['other', 'Altres'],
];

export const sourceLabels = {
  manual: 'Manual',
  automatic: 'Automàtic',
  crm_rule: 'Regla CRM',
};

export const priorityLabels = { alta: 'Alta', media: 'Mitja', baja: 'Baixa' };
export const urgencyLabels = { alta: 'Alta', media: 'Mitja', baja: 'Baixa' };

export const leadStatusLabels = {
  active: 'En seguiment',
  won: 'Guanyat',
  lost: 'Perdut',
  paused: 'Pausat',
  archived: 'Arxivat',
};

export const scoreBucketLabels = {
  critical: 'Molt prioritari',
  high: 'Prioritari',
  medium: 'Mitjà',
  low: 'Baix',
};
