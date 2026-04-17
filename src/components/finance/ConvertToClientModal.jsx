import React, { useMemo, useState } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/api/supabaseClient';
import { contractDraftFromLead, formatEuro } from '@/lib/finance';
import { useQueryClient } from '@tanstack/react-query';

// Converteix un lead en client: crea contract + 1a factura (setup) + billing_schedule (recurrent).
// Props: { lead, proposal, onClose }
export default function ConvertToClientModal({ lead, proposal, onClose }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const defaults = useMemo(() => contractDraftFromLead(lead, proposal), [lead, proposal]);

  const [form, setForm] = useState({
    ...defaults,
    // Primera factura
    create_first_invoice: true,
    first_invoice_amount: defaults.setup_fee > 0 ? Math.round(defaults.setup_fee * 0.5) : 0,
    first_invoice_description: 'Primer pagament a la signatura (50% implantació)',
    // Recurrent
    create_billing_schedule: defaults.monthly_fee > 0,
    billing_description: 'Quota mensual de manteniment',
    billing_start_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleConvert = async () => {
    setSaving(true);
    setError(null);
    try {
      // 1. Actualitzar lead (lifecycle + pipeline)
      const { error: leadErr } = await supabase
        .from('leads')
        .update({
          lifecycle_stage: 'customer',
          pipeline_status: 'ganado',
          lead_status: 'active',
          closing_date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', lead.id);
      if (leadErr) throw leadErr;

      // 2. Crear contract
      const contractPayload = {
        account_id: lead.account_id,
        lead_id: lead.id,
        project_id: lead.project_id,
        proposal_id: proposal?.id || null,
        code: form.code,
        title: form.title,
        client_name: form.client_name,
        client_nif: form.client_nif || null,
        client_email: form.client_email || null,
        client_address: form.client_address || null,
        status: form.status,
        setup_fee: Number(form.setup_fee) || null,
        monthly_fee: Number(form.monthly_fee) || null,
        currency: form.currency,
        tax_rate: Number(form.tax_rate) || 21,
        signed_date: form.signed_date,
        start_date: form.start_date,
        billing_day: Number(form.billing_day) || 1,
        auto_renew: !!form.auto_renew,
        notes: form.notes || null,
      };
      const { data: contract, error: cErr } = await supabase
        .from('contracts')
        .insert(contractPayload)
        .select()
        .single();
      if (cErr) throw cErr;

      let firstInvoice = null;
      let schedule = null;

      // 3. Primera factura (opcional)
      if (form.create_first_invoice && Number(form.first_invoice_amount) > 0) {
        const { data: inv, error: iErr } = await supabase
          .from('invoices')
          .insert({
            account_id: lead.account_id,
            lead_id: lead.id,
            project_id: lead.project_id,
            contract_id: contract.id,
            kind: 'setup',
            status: 'draft',
            issue_date: new Date().toISOString().slice(0, 10),
            due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
            client_name: form.client_name,
            client_nif: form.client_nif || null,
            client_email: form.client_email || null,
            client_address: form.client_address || null,
            tax_rate: Number(form.tax_rate) || 21,
            currency: form.currency,
            notes: 'Factura generada automàticament en la conversió a client',
          })
          .select()
          .single();
        if (iErr) throw iErr;

        const { error: lErr } = await supabase.from('invoice_lines').insert({
          invoice_id: inv.id,
          description: form.first_invoice_description,
          quantity: 1,
          unit_price: Number(form.first_invoice_amount),
          tax_rate: Number(form.tax_rate) || 21,
          sort_order: 0,
        });
        if (lErr) throw lErr;
        firstInvoice = inv;
      }

      // 4. Billing schedule (opcional)
      if (form.create_billing_schedule && Number(form.monthly_fee) > 0) {
        const { data: s, error: sErr } = await supabase
          .from('billing_schedules')
          .insert({
            account_id: lead.account_id,
            contract_id: contract.id,
            lead_id: lead.id,
            description: form.billing_description,
            amount: Number(form.monthly_fee),
            tax_rate: Number(form.tax_rate) || 21,
            currency: form.currency,
            frequency: 'monthly',
            billing_day: Number(form.billing_day) || 1,
            start_date: form.billing_start_date,
            next_run_date: form.billing_start_date,
            is_active: true,
          })
          .select()
          .single();
        if (sErr) throw sErr;
        schedule = s;
      }

      // 5. Si teníem una proposta, marcar-la com acceptada
      if (proposal?.id) {
        await supabase.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id);
      }

      setResult({ contract, invoice: firstInvoice, schedule });
      qc.invalidateQueries();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const expectedAnnual = (Number(form.setup_fee) || 0) + (Number(form.monthly_fee) || 0) * 12;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-slate-900">Convertir en client · {lead.company || lead.name}</h2>
            <p className="text-xs text-slate-500">
              Crea contract, primera factura i pla de cobraments recurrents.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
        </div>

        {result ? (
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-semibold">Conversió completada</p>
            </div>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• Contract <code>{result.contract.code}</code> creat en estat <strong>{result.contract.status}</strong></li>
              {result.invoice && <li>• Factura <code>{result.invoice.number}</code> generada · {formatEuro(form.first_invoice_amount)}</li>}
              {result.schedule && <li>• Billing schedule mensual · {formatEuro(result.schedule.amount)}/mes · pròxim cobrament {result.schedule.next_run_date}</li>}
            </ul>
            <Button className="w-full" onClick={onClose}>Tancar</Button>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <section>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Contracte</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Codi"><Input value={form.code} onChange={(e) => set('code', e.target.value)} /></Field>
                <Field label="Títol"><Input value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
                <Field label="Nom del client"><Input value={form.client_name} onChange={(e) => set('client_name', e.target.value)} /></Field>
                <Field label="NIF"><Input value={form.client_nif} onChange={(e) => set('client_nif', e.target.value)} /></Field>
                <Field label="Email"><Input value={form.client_email} onChange={(e) => set('client_email', e.target.value)} /></Field>
                <Field label="Adreça"><Input value={form.client_address} onChange={(e) => set('client_address', e.target.value)} /></Field>
                <Field label="Setup (€)"><Input type="number" value={form.setup_fee} onChange={(e) => set('setup_fee', e.target.value)} /></Field>
                <Field label="Quota mensual (€)"><Input type="number" value={form.monthly_fee} onChange={(e) => set('monthly_fee', e.target.value)} /></Field>
                <Field label="IVA %"><Input type="number" value={form.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} /></Field>
                <Field label="Dia de facturació (1-28)"><Input type="number" min={1} max={28} value={form.billing_day} onChange={(e) => set('billing_day', e.target.value)} /></Field>
                <Field label="Data de signatura"><Input type="date" value={form.signed_date} onChange={(e) => set('signed_date', e.target.value)} /></Field>
                <Field label="Data d'inici"><Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></Field>
                <Field label="Estat">
                  <Select value={form.status} onValueChange={(v) => set('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Esborrany</SelectItem>
                      <SelectItem value="signed">Signat</SelectItem>
                      <SelectItem value="active">Actiu</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                  <input type="checkbox" checked={form.auto_renew} onChange={(e) => set('auto_renew', e.target.checked)} />
                  Renovació automàtica
                </label>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-slate-800 font-semibold mb-2">
                <input type="checkbox" checked={form.create_first_invoice} onChange={(e) => set('create_first_invoice', e.target.checked)} />
                Crear primera factura (setup)
              </label>
              {form.create_first_invoice && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Descripció"><Input value={form.first_invoice_description} onChange={(e) => set('first_invoice_description', e.target.value)} /></Field>
                  <Field label="Import (€)"><Input type="number" value={form.first_invoice_amount} onChange={(e) => set('first_invoice_amount', e.target.value)} /></Field>
                </div>
              )}
            </section>

            <section className="border-t border-slate-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-slate-800 font-semibold mb-2">
                <input type="checkbox" checked={form.create_billing_schedule} onChange={(e) => set('create_billing_schedule', e.target.checked)} />
                Crear pla de cobrament recurrent
              </label>
              {form.create_billing_schedule && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Descripció"><Input value={form.billing_description} onChange={(e) => set('billing_description', e.target.value)} /></Field>
                  <Field label="Data d'inici (pròxim cobrament)"><Input type="date" value={form.billing_start_date} onChange={(e) => set('billing_start_date', e.target.value)} /></Field>
                </div>
              )}
            </section>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 flex items-center justify-between">
              <span>Valor anual estimat primer any</span>
              <strong>{formatEuro(expectedAnnual)}</strong>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel·lar</Button>
              <Button className="flex-1" onClick={handleConvert} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Convertint...</> : 'Convertir en client'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}
