import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const proposals = await base44.asServiceRole.entities.Proposal.list();

    return new Response(JSON.stringify(proposals), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="base44-proposals.json"',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});