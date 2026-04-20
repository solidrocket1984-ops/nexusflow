import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const INGEST_TOKEN = Deno.env.get("SUPERXAVI_INGEST_TOKEN");

const SOURCE_TO_PROJECT: Record<string, string> = {
  base44_respondeya: "respondeya",
  base44_enllac: "enlac_digital",
  form: "maind",
  manual: "maind",
};

Deno.serve(async (req: Request) => {
  if (!INGEST_TOKEN) {
    return Response.json({ ok: false, error: "SUPERXAVI_INGEST_TOKEN no configurado" }, { status: 500 });
  }
  const token = req.headers.get("x-superxavi-ingest-token") ?? "";
  if (token !== INGEST_TOKEN) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return Response.json({ ok: false, error: "invalid json" }, { status: 400 }); }

  const { source = "unknown", event = "lead.received", record } = body;
  if (!record) return Response.json({ ok: false, error: "missing record" }, { status: 400 });

  const name = record.nombre || record.name || "";
  const email = (record.email || "").toLowerCase().trim();
  const phone = (record.telefono || record.phone || "").replace(/[\s+\-()]/g, "");
  const company = record.empresa || record.company || "";
  const mensaje = record.mensaje || record.message || "";
  const solucion = record.solucion || "";

  if (!name && !email) {
    return Response.json({ ok: false, error: "name or email required" }, { status: 400 });
  }

  const projectId = SOURCE_TO_PROJECT[source] || "maind";
  const duplicateKey = [email, phone, company.toLowerCase().trim()].filter(Boolean).join("|");

  try {
    const base44 = createClientFromRequest(req);
    let existingLead: any = null;
    if (email) {
      try {
        const found = await base44.asServiceRole.entities.Lead.filter({ email });
        if (found && found.length > 0) existingLead = found[0];
      } catch {}
    }

    let lead: any;
    let action: string;

    if (existingLead) {
      const updates: Record<string, any> = {
        last_interaction: new Date().toISOString(),
        last_activity: `${event} desde ${source}`,
        source_system: existingLead.source_system || source,
        duplicate_key: duplicateKey,
        days_without_activity: 0,
      };
      if (!existingLead.phone && phone) updates.phone = phone;
      if (!existingLead.company && company) updates.company = company;
      if (!existingLead.contact_name && name) updates.contact_name = name;
      if (!existingLead.message && mensaje) updates.message = mensaje;
      if (solucion && !existingLead.pain_point) updates.pain_point = solucion;

      lead = await base44.asServiceRole.entities.Lead.update(existingLead.id, updates);
      action = "updated";
    } else {
      lead = await base44.asServiceRole.entities.Lead.create({
        name: name || company || email,
        contact_name: name,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        project_id: projectId,
        pipeline_status: "nuevo",
        lifecycle_stage: "lead",
        temperature: "frio",
        source: "inbound",
        source_system: source,
        duplicate_key: duplicateKey,
        origin: `n8n:${source}`,
        message: mensaje || undefined,
        pain_point: solucion || undefined,
        last_interaction: new Date().toISOString(),
        last_activity: `Creado via ${source}: ${event}`,
        days_without_activity: 0,
      });
      action = "created";
    }

    return Response.json({
      ok: true, action,
      lead_id: lead?.id || existingLead?.id,
      duplicate_key: duplicateKey,
      project_id: projectId,
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err), source, event }, { status: 500 });
  }
});