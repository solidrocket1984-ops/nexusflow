import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ENLAC_DIGITAL_PROJECT_ID = '69b599c67e80030f60f34e93';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { name, business, phone, email, message, sector, source_channel } = body;

    if (!name && !email && !phone) {
      return Response.json({ error: 'Cal almenys nom, email o telèfon' }, { status: 400 });
    }

    // Deduplication: check if lead already exists with same email or phone
    if (email) {
      const existing = await base44.asServiceRole.entities.Lead.filter({ email: email.toLowerCase().trim() });
      if (existing.length > 0) {
        return Response.json({
          success: true,
          duplicate: true,
          lead_id: existing[0].id,
          message: 'Lead ja existent (email duplicat)',
        });
      }
    }

    if (phone && !email) {
      const existing = await base44.asServiceRole.entities.Lead.filter({ phone: phone.trim() });
      if (existing.length > 0) {
        return Response.json({
          success: true,
          duplicate: true,
          lead_id: existing[0].id,
          message: 'Lead ja existent (telèfon duplicat)',
        });
      }
    }

    const today = new Date().toISOString().split('T')[0];

    const lead = await base44.asServiceRole.entities.Lead.create({
      name: name || company || email || phone,
      company: business || null,
      decision_maker: name || null,
      phone: phone || null,
      email: email ? email.toLowerCase().trim() : null,
      offer_angle: business ? `Negoci: ${business}` : null,
      notes: message ? `Landing: ${message}` : null,
      zone: sector || null,
      channel: source_channel || 'Web form',
      pipeline_status: 'nuevo',
      lead_status: 'Nou',
      responsible: 'Xavi',
      owner: 'Xavi',
      next_action: 'Trucar lead inbound',
      today_action: 'Contactar lead de la landing',
      next_action_date: today,
      priority: 'alta',
      temperature: 'templado',
      urgency: 'Alta',
      source: 'Landing Enllaç Digital',
      project_id: ENLAC_DIGITAL_PROJECT_ID,
      project: 'Enllaç Digital',
      last_activity_date: today,
      days_without_activity: 0,
    });

    return Response.json({
      success: true,
      lead_id: lead.id,
      message: 'Lead creat correctament al CRM',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});