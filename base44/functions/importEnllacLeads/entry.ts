import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

const ENLAC_PROJECT_ID = 'enlac_digital';

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (!date) return null;
    const m = String(date.m).padStart(2, '0');
    const d = String(date.d).padStart(2, '0');
    return `${date.y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return null;
}

function mapTemperature(val) {
  if (!val) return 'frio';
  const v = val.toString().toLowerCase();
  if (v.includes('calent')) return 'caliente';
  if (v.includes('fred')) return 'frio';
  if (v.includes('tevi') || v.includes('tibio') || v.includes('templ')) return 'templado';
  return 'frio';
}

function mapPriority(val) {
  if (!val) return 'media';
  const v = val.toString().toUpperCase();
  if (v === 'A') return 'alta';
  if (v === 'B') return 'media';
  if (v === 'C') return 'baja';
  return 'media';
}

function mapPipelineStatus(etapa) {
  if (!etapa) return 'nuevo';
  const v = etapa.toString().toLowerCase();
  if (v.includes('per contactar') || v.includes('nou') || v.includes('nuevo')) return 'nuevo';
  if (v.includes('contactat') || v.includes('contactado')) return 'contactado';
  if (v.includes('pendent') || v.includes('espera')) return 'pendiente_respuesta';
  if (v.includes('demo') || v.includes('reunió') || v.includes('reunion')) return 'reunion_agendada';
  if (v.includes('proposta') || v.includes('propuesta')) return 'propuesta_enviada';
  if (v.includes('negoci')) return 'negociacion';
  if (v.includes('guanyat') || v.includes('ganado')) return 'ganado';
  if (v.includes('perdut') || v.includes('perdido')) return 'perdido';
  return 'nuevo';
}

function mapUrgency(val) {
  if (!val) return null;
  const v = val.toString().toLowerCase();
  if (v.includes('alta') || v.includes('alt')) return 'alta';
  if (v.includes('mitj') || v.includes('media') || v.includes('mitg')) return 'media';
  if (v.includes('baix') || v.includes('baja')) return 'baja';
  return val;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url required' }, { status: 400 });

    // Fetch and parse Excel
    const resp = await fetch(fileUrl);
    const buffer = await resp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('crm leads') || n.toLowerCase().includes('leads'));
    if (!sheetName) return Response.json({ error: 'No CRM Leads sheet found', sheets: workbook.SheetNames }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const leads = rows.map(r => ({
      external_id: r['Lead ID'] || null,
      name: r['Compte / Celler'] || r['name'] || 'Sense nom',
      company: r['Compte / Celler'] || null,
      zone: r['Zona'] || null,
      municipality: r['Municipi'] || null,
      phone: r['Telèfon'] ? String(r['Telèfon']) : null,
      email: r['Email'] ? String(r['Email']).toLowerCase().trim() : null,
      website: r['Web'] || null,
      owner: r['Responsable'] || 'Xavi',
      responsible: r['Responsable'] || 'Xavi',
      pipeline_status: mapPipelineStatus(r['Etapa']),
      temperature: mapTemperature(r['Temperatura']),
      channel: r['Canal'] || null,
      last_contact: parseDate(r['Últim contacte']),
      last_activity_date: parseDate(r['Última activitat']),
      next_action: r['Pròxima acció'] || null,
      next_action_date: parseDate(r['Data pròxima acció']),
      current_result: r['Resultat actual'] || null,
      key_objection: r['Objeció clau'] || null,
      recommended_response: r['Resposta recomanada'] || null,
      offer_angle: r['Oferta / angle'] || null,
      demo_date: parseDate(r['Data demo']),
      proposal_date: parseDate(r['Data proposta']),
      closing_date: parseDate(r['Data tancament']),
      setup_fee: r['Setup €'] ? Number(r['Setup €']) : null,
      monthly_fee: r['Quota mensual €'] ? Number(r['Quota mensual €']) : null,
      probability: r['Prob. %'] ? Number(r['Prob. %']) : null,
      weighted_value: r['Valor ponderat €'] ? Number(r['Valor ponderat €']) : null,
      decision_maker: r['Decisor'] || null,
      lead_status: r['Estat lead'] || null,
      notes: r['Notes'] || null,
      source_url: r['Font / URL'] || null,
      last_activity: r['Última activitat'] ? String(r['Última activitat']) : null,
      days_without_activity: r['Dies sense activitat'] ? Number(r['Dies sense activitat']) : null,
      activities_count: r['Nº activitats'] ? Number(r['Nº activitats']) : null,
      urgency: mapUrgency(r['Urgència']),
      best_next_action: r['Següent millor acció'] || null,
      quick_message: r['Missatge ràpid'] || null,
      annual_value: r['Valor anual €'] ? Number(r['Valor anual €']) : null,
      forecast_90_days: r['Forecast 90 dies'] ? Number(r['Forecast 90 dies']) : null,
      days_until_next_action: r['Dies per pròxima acció'] ? Number(r['Dies per pròxima acció']) : null,
      abandonment_flag: r["Semàfor abandonament"] || null,
      today_action: r["Acció d'avui"] || null,
      priority: mapPriority(r['Prioritat']),
      project_id: ENLAC_PROJECT_ID,
      project: 'Enllaç Digital',
    }));

    // Bulk create in batches of 20
    const results = [];
    for (let i = 0; i < leads.length; i += 20) {
      const batch = leads.slice(i, i + 20);
      const created = await base44.asServiceRole.entities.Lead.bulkCreate(batch);
      results.push(...(Array.isArray(created) ? created : [created]));
    }

    return Response.json({
      success: true,
      total: leads.length,
      imported: results.length,
      sheet: sheetName,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});