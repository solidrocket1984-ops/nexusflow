import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url = body.file_url;
    const sheetName = body.sheet_name;

    const res = await fetch(file_url);
    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

    const s = workbook.Sheets[sheetName];
    if (!s) return Response.json({ error: 'Sheet not found', available: workbook.SheetNames });

    const rows = XLSX.utils.sheet_to_json(s, { defval: null });
    const nonNull = rows.filter(r => r['Compte / Celler'] != null && r['Compte / Celler'] !== '');
    return Response.json({
      sheet: sheetName,
      totalRows: rows.length,
      nonNullCeller: nonNull.length,
      keys: Object.keys(rows[0] || {}),
      sampleRows: rows.slice(0, 3),
      allCellerValues: nonNull.map(r => r['Compte / Celler'])
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});