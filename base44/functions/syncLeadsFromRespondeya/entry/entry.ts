import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const SUPABASE_URL = "https://pnxxinbmlynujwcwvkaw.supabase.co/rest/v1/leads";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBueHhpbmJtbHludWp3Y3d2a2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3ODI2NjAsImV4cCI6MjA1OTM1ODY2MH0.g3qSvNLnD9JVqCYI3iJR7GbHNuWNrEVismjQHQDhHRI";
const RESPONDEYA_PROJECT_ID = "69b599c67e80030f60f34e94";

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch leads from Supabase RespondeYA
    const params = new URLSearchParams({
      select: "id,name,email,phone,company,message,need,created_at",
      status: "eq.new",
      order: "created_at.desc",
      limit: "20",
    });

    const supabaseRes = await fetch(`${SUPABASE_URL}?${params}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      return Response.json({ ok: false, error: `Supabase error: ${errText}` }, { status: 500 });
    }

    const supabaseLeads: any[] = await supabaseRes.json();

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of supabaseLeads) {
      try {
        const email = (lead.email || "").toLowerCase().trim();

        // Check dedup by email
        let existing: any = null;
        if (email) {
          const found = await base44.asServiceRole.entities.Lead.filter({ email });
          if (found && found.length > 0) existing = found[0];
        }

        // Also check by supabase_id to avoid re-importing
        if (!existing && lead.id) {
          const foundById = await base44.asServiceRole.entities.Lead.filter({ supabase_id: String(lead.id) });
          if (foundById && foundById.length > 0) existing = foundById[0];
        }

        if (existing) {
          skipped++;
          continue;
        }

        // Create new lead
        await base44.asServiceRole.entities.Lead.create({
          name: lead.name || lead.company || email || "Sin nombre",
          contact_name: lead.name || "",
          company: lead.company || "",
          email: email || undefined,
          phone: lead.phone || undefined,
          message: lead.message || undefined,
          notes: lead.need || undefined,
          source: "landing_respondeya",
          source_system: "respondeya",
          channel: "web",
          pipeline_status: "nuevo",
          temperature: "caliente",
          lifecycle_stage: "lead",
          project_id: RESPONDEYA_PROJECT_ID,
          supabase_id: String(lead.id),
          last_interaction: lead.created_at || new Date().toISOString(),
          last_activity: "Importado desde RespondeYA Supabase",
          days_without_activity: 0,
        });

        synced++;
      } catch (err) {
        errors.push(`Lead ${lead.id || lead.email}: ${String(err)}`);
      }
    }

    return Response.json({ ok: true, synced, skipped, errors, total: supabaseLeads.length });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
});