# Capa de Finances · Setup

Aquesta extensió afegeix al CRM `nexusflow` la gestió 360 de clients, contractes, factures, cobraments recurrents i pagaments. Totes les dades viuen a **Supabase (projecte `RespondeYA-core`)** com a única font de veritat.

## 1. Dependència nova

Afegeix al `package.json`:

```json
"@supabase/supabase-js": "^2.45.0"
```

```bash
npm install @supabase/supabase-js
```

## 2. Variables d'entorn (`.env.local`)

```env
# Existents (Base44)
VITE_BASE44_APP_ID=...
VITE_BASE44_APP_BASE_URL=...

# Noves (Supabase — necessàries per Finances)
VITE_SUPABASE_URL=https://pnxxinbmlynujwcwvkaw.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-del-dashboard-supabase>
VITE_DEFAULT_ACCOUNT_SLUG=enllacdigital
```

> L'`anon key` la trobes a **Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`**.

## 3. Autenticació Supabase (primera vegada)

Les taules noves tenen RLS basat en `is_member(account_id)`. El teu usuari de Supabase ha de ser membre de l'account `Enllaç Digital`. Per activar-ho:

1. Crea un usuari Auth a Supabase amb el teu email (Authentication → Users → Invite).
2. Afegeix-lo a la taula `account_members` (o equivalent) amb `account_id = afdfa23f-2ff8-44b9-9c84-332c62d6be2f`.
3. Des de l'app, la primera vegada et farà falta implementar un login magic-link (el client ja està preparat: `supabaseClient.signInWithEmail(email)`).

**Alternativa ràpida** per provar localment: desactiva temporalment RLS a les 5 taules noves i confia en l'`anon key`.

## 4. Arxius nous / modificats

### Nous

```
src/api/supabaseClient.js
src/lib/finance.js
src/lib/useFinanceData.jsx
src/components/finance/ConvertToClientModal.jsx
src/components/finance/InvoiceEditorModal.jsx
src/components/finance/BillingScheduleModal.jsx
src/components/finance/PaymentModal.jsx
src/pages/Clients.jsx
src/pages/ClientDetail.jsx
src/pages/Invoices.jsx
src/pages/InvoiceDetail.jsx
src/pages/Billing.jsx
supabase/functions/run-billing-cron/index.ts
```

### Sobreescrits (mantenen tot el que ja feien i afegeixen)

```
src/App.jsx               → 5 rutes noves
src/components/Layout.jsx → sidebar amb seccions Comercial / Finances / Sistema
src/pages/LeadDetail.jsx  → botó "Convertir en client" + tab Finances
```

## 5. Funcionament

### Flux de conversió

1. Obres el detall d'un lead amb una proposta acceptada.
2. Fas clic a **Convertir en client**.
3. El modal crea d'un sol cop: `contract` + primera `invoice` (amb `invoice_line`) + `billing_schedule` mensual.
4. El lead passa a `lifecycle_stage=customer`; la proposta a `status=accepted`.

### Cobraments recurrents

- Cada `billing_schedule` té un `next_run_date`. Des de `/Billing` pots clicar **Generar ara** per un schedule concret, o **Generar tots els vençuts** per processar en batch.
- Cada execució crida la funció SQL `generate_invoice_from_schedule(id)` que crea la factura en `draft`, afegeix la línia i avança `next_run_date` segons la freqüència.

### Pagaments

- Des del detall d'una factura, **Registrar pagament** crea un registre a `payments`.
- Un trigger actualitza automàticament `amount_paid`, `amount_due` i posa `status='paid'` quan el pagament cobreix el total.

## 6. Cron mensual automàtic (opcional)

### Deploy de l'Edge Function

```bash
supabase functions deploy run-billing-cron --project-ref pnxxinbmlynujwcwvkaw
supabase secrets set CRON_SHARED_TOKEN=<tria-un-token-llarg> --project-ref pnxxinbmlynujwcwvkaw
```

### Programar-la amb `pg_cron` (6 del matí cada dia)

```sql
-- Activar extensions si encara no ho estan
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Job diari
SELECT cron.schedule(
  'billing-daily',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://pnxxinbmlynujwcwvkaw.supabase.co/functions/v1/run-billing-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_shared_token'),
        'Content-Type', 'application/json'
      )
    );
  $$
);
```

O més simple: des del **Supabase Dashboard → Database → Cron Jobs** pots crear el mateix job amb UI.

### Executar manualment

```powershell
$headers = @{ Authorization = "Bearer $TOKEN" }
Invoke-RestMethod -Uri "https://pnxxinbmlynujwcwvkaw.supabase.co/functions/v1/run-billing-cron" `
                  -Method POST -Headers $headers
```

## 7. Decisions de disseny assumides

- **Supabase és el system of record** per Contracts/Invoices/InvoiceLines/BillingSchedules/Payments. Base44 SDK es manté per Lead/Activity/Task/EmailDraft/Proposal fins que decidim migrar-ho tot.
- **Account slug per defecte**: `enllacdigital`. Canvia `VITE_DEFAULT_ACCOUNT_SLUG` si vols preconfigurar una altra.
- **Sèrie per defecte**: `ENLLAC`. La numeració és `AAAA-NNNN` per (account, series, any).
- **IVA per defecte**: 21%. Configurable per contracte i per línia.
- **Dia de facturació màxim**: 28 (per evitar problemes amb mesos curts).
- **Pasarela de pagament**: no integrada (decisió explícita). Els camps `stripe_subscription_id` i `stripe_customer_id` a `billing_schedules` ja existeixen per al dia que s'activi.

## 8. Què testejar abans del demo d'Oriol

- [ ] Login Supabase funciona i `crm_clients` retorna dades sense error RLS.
- [ ] Obrir Jaume Domingo al CRM → botó "Convertir en client" crea contracte + factura + schedule.
- [ ] `/Clients` mostra Jaume amb MRR 175€.
- [ ] `/Invoices` mostra la factura setup amb status `draft`.
- [ ] `/Billing` mostra el schedule mensual amb `next_run_date` correcte.
- [ ] Registrar un pagament de la factura setup → passa a `paid` automàticament.
- [ ] Edge function `run-billing-cron` respon amb `generated_count` quan el truques amb el token.
