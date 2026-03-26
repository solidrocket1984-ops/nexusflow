import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();

  // Fetch the Excel file
  const res = await fetch(file_url);
  const arrayBuffer = await res.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

  const sheet = workbook.Sheets['CRM Leads'];
  if (!sheet) return Response.json({ error: 'Sheet CRM Leads not found' }, { status: 400 });

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const formatDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
    if (typeof val === 'string') return val.split(' ')[0];
    return null;
  };

  const leads = rows.map(row => ({
    external_id: row['Lead ID'] || null,
    priority: row['Prioritat'] || null,
    company: row['Compte / Celler'] || null,
    name: row['Compte / Celler'] || null,
    zone: row['Zona'] || null,
    municipality: row['Municipi'] || null,
    phone: row['Telèfon'] != null ? String(row['Telèfon']) : null,
    email: row['Email'] || null,
    website: row['Web'] || null,
    owner: row['Responsable'] || null,
    responsible: row['Responsable'] || null,
    pipeline_status: row['Etapa'] || null,
    temperature: row['Temperatura'] || null,
    channel: row['Canal'] || null,
    last_contact: formatDate(row['Últim contacte']),
    next_action: row['Pròxima acció'] || null,
    next_action_date: formatDate(row['Data pròxima acció']),
    current_result: row['Resultat actual'] || null,
    key_objection: row['Objeció clau'] || null,
    recommended_response: row['Resposta recomanada'] || null,
    offer_angle: row['Oferta / angle'] || null,
    demo_date: formatDate(row['Data demo']),
    proposal_date: formatDate(row['Data proposta']),
    closing_date: formatDate(row['Data tancament']),
    setup_fee: row['Setup €'] != null ? Number(row['Setup €']) : null,
    monthly_fee: row['Quota mensual €'] != null ? Number(row['Quota mensual €']) : null,
    probability: row['Prob. %'] != null ? Number(row['Prob. %']) : null,
    weighted_value: row['Valor ponderat €'] != null ? Number(row['Valor ponderat €']) : null,
    decision_maker: row['Decisor'] || null,
    lead_status: row['Estat lead'] || null,
    notes: row['Notes'] || null,
    source_url: row['Font / URL'] || null,
    last_activity: row['Última activitat'] != null ? String(row['Última activitat']) : null,
    days_without_activity: row['Dies sense activitat'] != null ? Number(row['Dies sense activitat']) : null,
    activities_count: row['Nº activitats'] != null ? Number(row['Nº activitats']) : null,
    urgency: row['Urgència'] || null,
    best_next_action: row['Següent millor acció'] || null,
    quick_message: row['Missatge ràpid'] || null,
    annual_value: row['Valor anual €'] != null ? Number(row['Valor anual €']) : null,
    forecast_90_days: row['Forecast 90 dies'] != null ? Number(row['Forecast 90 dies']) : null,
    days_until_next_action: row['Dies per pròxima acció'] != null ? Number(row['Dies per pròxima acció']) : null,
    abandonment_flag: row['Semàfor abandonament'] || null,
    today_action: row["Acció d'avui"] || null,
    project: 'Enllaç Digital',
  })).filter(l => l.name);

  // Bulk create
  const created = await base44.asServiceRole.entities.Lead.bulkCreate(leads);

  return Response.json({ success: true, imported: leads.length, created: created?.length });
});