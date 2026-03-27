import { format } from 'date-fns';

export const ENLLAC_CONTACT_BLOCK = {
  empresa: 'Enllaç Digital',
  persona: 'Equip comercial',
  email: 'hola@enllacdigital.com',
  phone: '+34 000 000 000',
  website: 'https://enllacdigital.com',
};

export const PROPOSAL_STATUS_LABELS = {
  draft: 'Esborrany',
  ready: 'Preparada',
  sent: 'Enviada',
  accepted: 'Acceptada',
  rejected: 'Rebutjada',
};

export const DEFAULT_TEMPLATE_NAME = 'Enllaç Digital · Assistència digital web';

export function roundTo2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizePricingRow(row = {}) {
  const concept = row.concept || row.concepte || '';
  const base = Number(row.base ?? row.base_imposable ?? 0);
  const vat = Number(row.vat ?? 0.21);
  const vatAmount = Number.isFinite(row.vatAmount)
    ? Number(row.vatAmount)
    : Number.isFinite(row.iva)
      ? Number(row.iva)
      : roundTo2(base * vat);

  return {
    concept,
    concepte: concept,
    base,
    base_imposable: base,
    vat,
    iva: roundTo2(vatAmount),
    vatAmount: roundTo2(vatAmount),
    total: roundTo2(base + vatAmount),
  };
}

const defaultPricingRows = (lead) => {
  const setupBase = Number(lead?.setup_fee || 1200);
  const monthlyBase = Number(lead?.monthly_fee || 390);

  return [
    { concept: 'Implantació inicial', base: setupBase, vat: 0.21 },
    { concept: 'Servei mensual / manteniment / optimització', base: monthlyBase, vat: 0.21 },
  ].map(normalizePricingRow);
};

export function calculatePricingRow(row) {
  return normalizePricingRow(row);
}

export function calculateProposalTotals(rows = []) {
  const normalizedRows = rows.map(normalizePricingRow);

  return normalizedRows.reduce(
    (acc, row) => {
      acc.baseTotal += row.base;
      acc.vatTotal += row.vatAmount;
      acc.grandTotal += row.total;
      acc.rows.push(row);
      return acc;
    },
    { rows: [], baseTotal: 0, vatTotal: 0, grandTotal: 0 }
  );
}

export function calculatePricingTotals(rows = []) {
  const totals = calculateProposalTotals(rows);
  return {
    base: totals.baseTotal,
    iva: totals.vatTotal,
    total: totals.grandTotal,
  };
}

export function getProposalClientName(lead = {}) {
  return lead.company?.trim() || lead.contact_name?.trim() || lead.name?.trim() || 'Client pendent de confirmar';
}

export function buildProposalContextFromLead(lead = {}) {
  return {
    client_name: getProposalClientName(lead),
    cover_sector_label: lead.niche || lead.sector || 'empresa de serveis',
    contact_person: lead.contact_name || lead.name || 'Persona de contacte pendent',
    email: lead.email || 'sense-email@pendent.cat',
    phone: lead.phone || 'Telèfon pendent',
    website: lead.website || 'Web pendent',
    notes: lead.notes || '',
    key_objection: lead.key_objection || lead.pain_point || '',
    recommended_response: lead.recommended_response || '',
    offer_angle: lead.offer_angle || 'Millorar l’atenció inicial web i augmentar conversió.',
    pricing_context: {
      setup_fee: Number(lead.setup_fee || 0),
      monthly_fee: Number(lead.monthly_fee || 0),
      annual_value: Number(lead.annual_value || 0),
    },
    project_brand: 'Enllaç Digital',
  };
}

export function buildDefaultProposalSections(lead = {}) {
  const context = buildProposalContextFromLead(lead);

  const plantejament = `Hem preparat aquesta proposta per a ${context.client_name}, pensada per millorar la primera atenció digital i convertir més visites web en oportunitats reals. ${context.cover_sector_label ? `En el context de ${context.cover_sector_label},` : ''} enfoquem la solució per mantenir un tracte personal però amb suport automatitzat des del primer contacte.`;

  const includedItems = [
    'Atenció immediata',
    'Orientació comercial',
    'Captació de leads',
    'Qualificació prèvia',
    'Gestió d’objeccions',
    'Base escalable',
  ];

  return {
    title: `Proposta d’assistent digital per a ${context.cover_sector_label}`,
    subtitle: 'Una proposta pensada per reforçar l’atenció inicial des de la web, sense perdre el valor del tracte personal.',
    summary: plantejament,
    problem: context.key_objection || 'Necessitat de respondre ràpidament i orientar millor els contactes entrants.',
    proposed_solution: context.recommended_response || 'Assistència inicial automatitzada amb derivació intel·ligent a l’equip comercial.',
    offer_angle: context.offer_angle,
    cover_sector_label: context.cover_sector_label,
    client_name: context.client_name,
    plantejament,
    included_items: includedItems,
    solution_items: includedItems,
    implementation_steps: [
      'Sessió inicial de definició de missatges i objectius.',
      'Configuració de l’assistent amb FAQs, objeccions i derivacions.',
      'Integració amb formularis i canals existents.',
      'Test funcional i ajustos de to comercial.',
      'Posada en marxa i seguiment inicial.',
    ],
    expected_results: [
      'Reducció del temps de resposta inicial.',
      'Millor qualificació dels contactes abans de la trucada comercial.',
      'Augment de reunions qualificades.',
      'Procés comercial més ordenat i mesurable.',
    ],
    process_steps: [
      'Diagnosi inicial i recollida de context.',
      'Disseny del flux de conversa.',
      'Implementació i proves.',
      'Llançament i monitoratge.',
      'Optimització contínua.',
    ],
    pricing_rows: defaultPricingRows(lead),
    contact_block: {
      ...ENLLAC_CONTACT_BLOCK,
      client: context.client_name,
      contact_person: context.contact_person,
      client_email: context.email,
      client_phone: context.phone,
      client_website: context.website,
      service_model: 'Subscripció mensual + implantació inicial',
      model_servei: 'Subscripció mensual + implantació inicial',
      tipus_document: 'Document de proposta',
      generated_on: format(new Date(), 'yyyy-MM-dd'),
    },
    notes: context.notes,
  };
}

export function serializeProposalPayload(values = {}, lead = {}) {
  const totals = calculateProposalTotals(values.pricing_rows || []);
  const status = values.status || 'draft';

  return {
    lead_id: values.lead_id || lead.id,
    project_id: values.project_id || lead.project_id,
    title: values.title || '',
    subtitle: values.subtitle || '',
    summary: values.summary || '',
    client_name: values.client_name || getProposalClientName(lead),
    plantejament: values.plantejament || values.problem || '',
    included_items: values.included_items || values.solution_items || [],
    solution_items: values.included_items || values.solution_items || [],
    implementation_steps: values.implementation_steps || [],
    expected_results: values.expected_results || [],
    process_steps: values.process_steps || [],
    pricing_rows: totals.rows,
    contact_block: {
      ...values.contact_block,
      service_model: values.contact_block?.service_model || values.contact_block?.model_servei || '',
      model_servei: values.contact_block?.model_servei || values.contact_block?.service_model || '',
    },
    notes: values.notes || '',
    status,
    sent_date: status === 'sent' ? values.sent_date || format(new Date(), 'yyyy-MM-dd') : values.sent_date,
  };
}

export function serializeProposalForCopy(proposal) {
  const priceRows = (proposal.pricing_rows || [])
    .map((row) => {
      const normalized = normalizePricingRow(row);
      return `- ${normalized.concept}: ${normalized.total}€ (Base ${normalized.base}€ + IVA ${normalized.vatAmount}€)`;
    })
    .join('\n');
  const solution = (proposal.included_items || proposal.solution_items || []).map((x) => `- ${x}`).join('\n');
  const implementation = (proposal.implementation_steps || []).map((x) => `- ${x}`).join('\n');
  const expected = (proposal.expected_results || []).map((x) => `- ${x}`).join('\n');
  const process = (proposal.process_steps || []).map((x, i) => `${i + 1}. ${x}`).join('\n');

  return `${proposal.title}\n${proposal.subtitle}\n\nClient: ${proposal.client_name}\n\nPlantejament\n${proposal.plantejament || proposal.summary || ''}\n\nQuè inclou la solució\n${solution}\n\nImplantació i posada en marxa\n${implementation}\n\nCondicions econòmiques\n${priceRows}\n\nResultat esperat\n${expected}\n\nProcés de treball\n${process}`;
}
