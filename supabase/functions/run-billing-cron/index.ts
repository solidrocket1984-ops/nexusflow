// supabase/functions/run-billing-cron/index.ts
// Edge Function per executar `run_due_billing_schedules()`.
// Executa-ho:
//   - Manualment:  curl -X POST https://<project>.supabase.co/functions/v1/run-billing-cron \
//                        -H "Authorization: Bearer $SUPERXAVI_API_TOKEN"
//   - Amb pg_cron: SELECT cron.schedule('billing-daily', '0 6 * * *',
//                     $$ SELECT net.http_post(
//                          url := 'https://<project>.supabase.co/functions/v1/run-billing-cron',
//                          headers := jsonb_build_object(
//                            'Authorization', 'Bearer <SUPERXAVI_API_TOKEN>',
//                            'Content-Type', 'application/json')
//                        ); $$);

import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_TOKEN = Deno.env.get('CRON_SHARED_TOKEN') ?? '';

Deno.serve(async (req) => {
  // Autenticació simple amb token compartit
  const authHeader = req.headers.get('Authorization') || '';
  const incomingToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!ALLOWED_TOKEN || incomingToken !== ALLOWED_TOKEN) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabase.rpc('run_due_billing_schedules');
    if (error) throw error;

    const generated = data || [];
    console.log(`[run-billing-cron] Generated ${generated.length} invoices`);

    return new Response(
      JSON.stringify({
        ok: true,
        generated_count: generated.length,
        items: generated,
        ran_at: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[run-billing-cron] Error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
