// Capa financiera · helpers compartits

export const CONTRACT_STATUS_LABELS = {
  draft: 'Esborrany',
  signed: 'Signat',
  active: 'Actiu',
  ended: 'Finalitzat',
  cancelled: 'Cancel·lat',
};

export const CONTRACT_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  signed: 'bg-indigo-100 text-indigo-700',
  active: 'bg-emerald-100 text-emerald-700',
  ended: 'bg-slate-200 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
};

export const INVOICE_STATUS_LABELS = {
  draft: 'Esborrany',
  issued: 'Emesa',
  sent: 'Enviada',
  paid: 'Pagada',
  overdue: 'Vençuda',
  void: 'Anul·lada',
};

export const INVOICE_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  issued: 'bg-blue-100 text-blue-700',
  sent: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-slate-200 text-slate-500 line-through',
};

export const INVOICE_KIND_LABELS = {
  setup: 'Implantació',
  recurring: 'Recurrent',
  one_off: 'Puntual',
  credit_note: 'Abonament',
};

export const PAYMENT_METHOD_LABELS = {
  sepa: 'SEPA',
  card: 'Targeta',
  transfer: 'Transferència',
  cash: 'Efectiu',
  stripe: 'Stripe',
  other: 'Altre',
};

export const BILLING_FREQUENCY_LABELS = {
  weekly: 'Setmanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  biannual: 'Semestral',
  yearly: 'Anual',
};

export function formatEuro(value, { currency = 'EUR' } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('ca-ES');
  } catch {
    return String(value).slice(0, 10);
  }
}

// Utilitat: derivar dades mínimes d'un lead per inicialitzar un contract
export function contractDraftFromLead(lead, proposal) {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const slugCompany = (lead.company || lead.name || 'CLIENT')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 3);
  return {
    code: `${year}-${slugCompany}-001`,
    title: proposal?.title || `Contracte ${lead.company || lead.name}`,
    client_name: lead.company || lead.name,
    client_nif: lead.nif || '',
    client_email: lead.email || '',
    client_address: lead.address || '',
    status: 'signed',
    setup_fee: Number(proposal?.setup_fee ?? lead.setup_price ?? 0) || 0,
    monthly_fee: Number(proposal?.monthly_fee ?? lead.monthly_price ?? 0) || 0,
    currency: 'EUR',
    tax_rate: 21,
    signed_date: today,
    start_date: today,
    billing_day: 1,
    auto_renew: true,
    notes: '',
  };
}
