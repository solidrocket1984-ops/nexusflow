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

    // CRM_Leads sheet: row 0 is a title, row 1 is the real header
    const sheet = workbook.Sheets['CRM_Leads'];
    if (!sheet) return Response.json({ error: 'Sheet CRM_Leads not found' }, { status: 400 });

    // range: 1 skips the first row (title) and uses row index 1 as headers
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, range: 1 });

    const formatDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().split('T')[0];
      const s = String(val);
      if (s.includes('T')) return s.split('T')[0];
      return s.split(' ')[0];
    };

    const toStr = (val) => (val != null && val !== '' ? String(val) : null);

    const leads = rows
      .map(row => {
        const company = toStr(row['Empresa']);
        const contactName = toStr(row['Contacto']);
        const name = company || contactName;
        if (!name) return null;

        // Map temperature
        const rawTemp = toStr(row['Temperatura']);
        let temperature = 'frio';
        if (rawTemp) {
          const t = rawTemp.toLowerCase();
          if (t === 'hot' || t === 'caliente' || t === 'calent') temperature = 'caliente';
          else if (t === 'warm' || t === 'templado' || t === 'tevi') temperature = 'templado';
        }

        // Map pipeline status
        const rawStatus = toStr(row['Estado lead']);
        let pipeline_status = 'nuevo';
        if (rawStatus) {
          const s = rawStatus.toLowerCase();
          if (s.includes('contact')) pipeline_status = 'contactado';
          else if (s.includes('llamada') || s.includes('trucada')) pipeline_status = 'contactado';
          else if (s.includes('demo')) pipeline_status = 'reunion_agendada';
          else if (s.includes('propuesta')) pipeline_status = 'propuesta_enviada';
          else if (s.includes('negoci')) pipeline_status = 'negociacion';
          else if (s.includes('cerrado') || s.includes('ganado')) pipeline_status = 'ganado';
          else if (s.includes('perdido') || s.includes('perdut')) pipeline_status = 'perdido';
        }

        return {
          external_id: toStr(row['ID Lead']),
          company,
          contact_name: contactName,
          name,
          channel: toStr(row['Canal']),
          niche: toStr(row['Nicho']),
          pain_point: toStr(row['Dolor principal']),
          lead_status: toStr(row['Estado lead']),
          pipeline_status,
          temperature,
          website: toStr(row['web']),
          email: toStr(row['Email']),
          address: toStr(row['Dirección']),
          phone: toStr(row['Teléfono']),
          source: toStr(row['Origen']),
          last_message: toStr(row['Último mensaje']),
          message: toStr(row['Mensaje']),
          next_action: toStr(row['Próxima acción']),
          last_contact: formatDate(row['Fecha alta']),
          project: 'Respondeya',
          project_id: '69b599c67e80030f60f34e94',
        };
      })
      .filter(Boolean);

    let created = 0;
    const batchSize = 20;
    for (let i = 0; i < leads.length; i += batchSize) {
      await base44.asServiceRole.entities.Lead.bulkCreate(leads.slice(i, i + batchSize));
      created += Math.min(batchSize, leads.length - i);
    }

    return Response.json({ success: true, totalRows: rows.length, imported: leads.length, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});