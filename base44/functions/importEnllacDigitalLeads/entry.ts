import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;

    const res = await fetch(file_url);
    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

    // Find the sheet with the most rows that has 'Lead ID' column
    const sheetNames = workbook.SheetNames;
    let rows = [];
    for (const name of sheetNames) {
      const s = workbook.Sheets[name];
      const r = XLSX.utils.sheet_to_json(s, { defval: null });
      if (r.length > rows.length) {
        const keys = Object.keys(r[0] || {});
        if (keys.some(k => String(k).trim() === 'Lead ID')) {
          rows = r;
        }
      }
    }

    if (rows.length === 0) {
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

    const leads = rows
      .map(row => {
        // Try both exact and trimmed column names
        const get = (key) => {
          if (row[key] != null && row[key] !== '') return row[key];
          const trimKey = Object.keys(row).find(k => k.trim() === key.trim());
          return trimKey ? row[trimKey] : null;
        };

        const name = get('Compte / Celler');
        if (!name) return null;

        return {
          external_id: toStr(get('Lead ID')),
          priority: toStr(get('Prioritat')),
          company: toStr(name),
          name: toStr(name),
          zone: toStr(get('Zona')),
          municipality: toStr(get('Municipi')),
          phone: toStr(get('Telèfon')),
          email: toStr(get('Email')),
          website: toStr(get('Web')),
          owner: toStr(get('Responsable')),
          responsible: toStr(get('Responsable')),
          pipeline_status: toStr(get('Etapa')),
          temperature: toStr(get('Temperatura')),
          channel: toStr(get('Canal')),
          last_contact: formatDate(get('Últim contacte')),
          next_action: toStr(get('Pròxima acció')),
          next_action_date: formatDate(get('Data pròxima acció')),
          current_result: toStr(get('Resultat actual')),
          key_objection: toStr(get('Objeció clau')),
          recommended_response: toStr(get('Resposta recomanada')),
          offer_angle: toStr(get('Oferta / angle')),
          demo_date: formatDate(get('Data demo')),
          proposal_date: formatDate(get('Data proposta')),
          closing_date: formatDate(get('Data tancament')),
          setup_fee: toNum(get('Setup €')),
          monthly_fee: toNum(get('Quota mensual €')),
          probability: toNum(get('Prob. %')),
          weighted_value: toNum(get('Valor ponderat €')),
          decision_maker: toStr(get('Decisor')),
          lead_status: toStr(get('Estat lead')),
          notes: toStr(get('Notes')),
          source_url: toStr(get('Font / URL')),
          last_activity: toStr(get('Última activitat')),
          days_without_activity: toNum(get('Dies sense activitat')),
          activities_count: toNum(get('Nº activitats')),
          urgency: toStr(get('Urgència')),
          best_next_action: toStr(get('Següent millor acció')),
          quick_message: toStr(get('Missatge ràpid')),
          annual_value: toNum(get('Valor anual €')),
          forecast_90_days: toNum(get('Forecast 90 dies')),
          days_until_next_action: toNum(get('Dies per pròxima acció')),
          abandonment_flag: toStr(get('Semàfor abandonament')),
          today_action: toStr(get("Acció d'avui")),
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

    return Response.json({ success: true, imported: leads.length, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});