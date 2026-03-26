import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;
    const debug = body.debug || false;

    const res = await fetch(file_url);
    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

    const sheetNames = workbook.SheetNames;

    if (debug) {
      const info = sheetNames.map(name => {
        const s = workbook.Sheets[name];
        const r = XLSX.utils.sheet_to_json(s, { defval: null });
        return {
          name,
          rows: r.length,
          keys: Object.keys(r[0] || {}),
          sample: r.slice(0, 2)
        };
      });
      return Response.json({ sheets: info });
    }

    // Find the CRM Leads sheet - look for sheet named "CRM Leads" or the one with most rows + Lead ID
    let targetSheet = null;
    let targetRows = [];

    for (const name of sheetNames) {
      const s = workbook.Sheets[name];
      const r = XLSX.utils.sheet_to_json(s, { defval: null });
      if (r.length > targetRows.length) {
        const keys = Object.keys(r[0] || {});
        if (keys.some(k => String(k).trim() === 'Lead ID')) {
          targetSheet = name;
          targetRows = r;
        }
      }
    }

    if (targetRows.length === 0) {
      return Response.json({ error: 'No CRM Leads sheet found', sheets: sheetNames });
    }

    const formatDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().split('T')[0];
      const s = String(val);
      if (s.includes('T')) return s.split('T')[0];
      return s.split(' ')[0];
    };

    const toNum = (val) => (val != null && val !== '' ? Number(val) : null);
    const toStr = (val) => (val != null && val !== '' ? String(val) : null);

    const get = (row, key) => {
      if (row[key] != null && row[key] !== '') return row[key];
      const found = Object.keys(row).find(k => k.trim() === key.trim());
      return found ? row[found] : null;
    };

    const leads = targetRows
      .map(row => {
        const name = get(row, 'Compte / Celler');
        if (!name) return null;

        return {
          external_id: toStr(get(row, 'Lead ID')),
          priority: toStr(get(row, 'Prioritat')),
          company: toStr(name),
          name: toStr(name),
          zone: toStr(get(row, 'Zona')),
          municipality: toStr(get(row, 'Municipi')),
          phone: toStr(get(row, 'Telèfon')),
          email: toStr(get(row, 'Email')),
          website: toStr(get(row, 'Web')),
          owner: toStr(get(row, 'Responsable')),
          responsible: toStr(get(row, 'Responsable')),
          pipeline_status: toStr(get(row, 'Etapa')),
          temperature: toStr(get(row, 'Temperatura')),
          channel: toStr(get(row, 'Canal')),
          last_contact: formatDate(get(row, 'Últim contacte')),
          next_action: toStr(get(row, 'Pròxima acció')),
          next_action_date: formatDate(get(row, 'Data pròxima acció')),
          current_result: toStr(get(row, 'Resultat actual')),
          key_objection: toStr(get(row, 'Objeció clau')),
          recommended_response: toStr(get(row, 'Resposta recomanada')),
          offer_angle: toStr(get(row, 'Oferta / angle')),
          demo_date: formatDate(get(row, 'Data demo')),
          proposal_date: formatDate(get(row, 'Data proposta')),
          closing_date: formatDate(get(row, 'Data tancament')),
          setup_fee: toNum(get(row, 'Setup €')),
          monthly_fee: toNum(get(row, 'Quota mensual €')),
          probability: toNum(get(row, 'Prob. %')),
          weighted_value: toNum(get(row, 'Valor ponderat €')),
          decision_maker: toStr(get(row, 'Decisor')),
          lead_status: toStr(get(row, 'Estat lead')),
          notes: toStr(get(row, 'Notes')),
          source_url: toStr(get(row, 'Font / URL')),
          last_activity: toStr(get(row, 'Última activitat')),
          days_without_activity: toNum(get(row, 'Dies sense activitat')),
          activities_count: toNum(get(row, 'Nº activitats')),
          urgency: toStr(get(row, 'Urgència')),
          best_next_action: toStr(get(row, 'Següent millor acció')),
          quick_message: toStr(get(row, 'Missatge ràpid')),
          annual_value: toNum(get(row, 'Valor anual €')),
          forecast_90_days: toNum(get(row, 'Forecast 90 dies')),
          days_until_next_action: toNum(get(row, 'Dies per pròxima acció')),
          abandonment_flag: toStr(get(row, 'Semàfor abandonament')),
          today_action: toStr(get(row, "Acció d'avui")),
          project: 'Enllaç Digital',
          project_id: '69b599c67e80030f60f34e93',
        };
      })
      .filter(Boolean);

    // Bulk create in batches of 20
    let created = 0;
    const batchSize = 20;
    for (let i = 0; i < leads.length; i += batchSize) {
      await base44.asServiceRole.entities.Lead.bulkCreate(leads.slice(i, i + batchSize));
      created += Math.min(batchSize, leads.length - i);
    }

    return Response.json({ success: true, sheet: targetSheet, totalRows: targetRows.length, imported: leads.length, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});