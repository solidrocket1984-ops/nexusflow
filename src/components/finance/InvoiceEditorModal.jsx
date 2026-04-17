import React, { useMemo, useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/api/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { INVOICE_STATUS_LABELS, INVOICE_KIND_LABELS, formatEuro } from '@/lib/finance';

// props: { invoice (optional, for edit), lead (required for create), contractId (optional), onClose }
export default function InvoiceEditorModal({ invoice, lead, contractId, onClose }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [header, setHeader] = useState(() => ({
    kind: invoice?.kind || 'setup',
    status: invoice?.status || 'draft',
    issue_date: (invoice?.issue_date || new Date().toISOString().slice(0, 10)),
    due_date: invoice?.due_date || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    client_name: invoice?.client_name || lead?.company || lead?.name || '',
    client_nif: invoice?.client_nif || '',
    client_email: invoice?.client_email || lead?.email || '',
    client_address: invoice?.client_address || lead?.address || '',
    tax_rate: invoice?.tax_rate ?? 21,
    currency: invoice?.currency || 'EUR',
    notes: invoice?.notes || '',
  }));

  const [lines, setLines] = useState(
    invoice?.lines?.length
      ? invoice.lines.map((l) => ({ ...l }))
      : [{ description: '', quantity: 1, unit_price: 0, tax_rate: 21, sort_order: 0 }]
  );

  useEffect(() => {
    if (invoice?.lines) setLines(invoice.lines.map((l) => ({ ...l })));
  }, [invoice?.id]);

  const totals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    lines.forEach((l) => {
      const s = Number(l.quantity || 0) * Number(l.unit_price || 0);
      const t = s * (Number(l.tax_rate || 0) / 100);
      sub += s;
      tax += t;
    });
    return { subtotal: sub, tax_amount: tax, total: sub + tax };
  }, [lines]);

  const updateLine = (idx, key, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { description: '', quantity: 1, unit_price: 0, tax_rate: header.tax_rate, sort_order: prev.length },
    ]);
  };

  const removeLine = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (invoice?.id) {
        // Update cabecera
        const { error: uErr } = await supabase.from('invoices').update(header).eq('id', invoice.id);
        if (uErr) throw uErr;

        // Sincronitzar línies (simplificació: delete + reinsert)
        const { error: dErr } = await supabase.from('invoice_lines').delete().eq('invoice_id', invoice.id);
        if (dErr) throw dErr;

        if (lines.length) {
          const rows = lines.map((l, i) => ({
            invoice_id: invoice.id,
            description: l.description,
            quantity: Number(l.quantity) || 1,
            unit_price: Number(l.unit_price) || 0,
            tax_rate: Number(l.tax_rate) || 0,
            sort_order: i,
          }));
          const { error: iErr } = await supabase.from('invoice_lines').insert(rows);
          if (iErr) throw iErr;
        }
      } else {
        // Create
        const { data: inv, error: cErr } = await supabase
          .from('invoices')
          .insert({
            ...header,
            account_id: lead.account_id,
            lead_id: lead.id,
            project_id: lead.project_id,
            contract_id: contractId || null,
          })
          .select()
          .single();
        if (cErr) throw cErr;

        if (lines.length) {
          const rows = lines.map((l, i) => ({
            invoice_id: inv.id,
            description: l.description,
            quantity: Number(l.quantity) || 1,
            unit_price: Number(l.unit_price) || 0,
            tax_rate: Number(l.tax_rate) || 0,
            sort_order: i,
          }));
          const { error: iErr } = await supabase.from('invoice_lines').insert(rows);
          if (iErr) throw iErr;
        }
      }
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['crm_clients'] });
      onClose?.();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-slate-900">
              {invoice?.id ? `Editar factura ${invoice.number}` : 'Nova factura'}
            </h2>
            <p className="text-xs text-slate-500">
              {lead?.company || lead?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
        </div>

        {error && <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

        <div className="p-4 space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Capçalera</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Tipus</p>
                <Select value={header.kind} onValueChange={(v) => setHeader((p) => ({ ...p, kind: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVOICE_KIND_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Estat</p>
                <Select value={header.status} onValueChange={(v) => setHeader((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">IVA %</p>
                <Input type="number" value={header.tax_rate} onChange={(e) => setHeader((p) => ({ ...p, tax_rate: e.target.value }))} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Data d'emissió</p>
                <Input type="date" value={header.issue_date} onChange={(e) => setHeader((p) => ({ ...p, issue_date: e.target.value }))} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Venciment</p>
                <Input type="date" value={header.due_date} onChange={(e) => setHeader((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Moneda</p>
                <Input value={header.currency} onChange={(e) => setHeader((p) => ({ ...p, currency: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Client</p>
                <Input value={header.client_name} onChange={(e) => setHeader((p) => ({ ...p, client_name: e.target.value }))} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">NIF</p>
                <Input value={header.client_nif} onChange={(e) => setHeader((p) => ({ ...p, client_nif: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Email</p>
                <Input value={header.client_email} onChange={(e) => setHeader((p) => ({ ...p, client_email: e.target.value }))} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Adreça</p>
                <Input value={header.client_address} onChange={(e) => setHeader((p) => ({ ...p, client_address: e.target.value }))} />
              </div>
              <div className="md:col-span-3">
                <p className="text-[11px] font-medium text-slate-600 uppercase mb-1">Notes</p>
                <Input value={header.notes} onChange={(e) => setHeader((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Línies</h3>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-4 h-4 mr-1" /> Afegir línia</Button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2">Descripció</th>
                    <th className="text-right p-2 w-20">Qt.</th>
                    <th className="text-right p-2 w-28">Preu unit.</th>
                    <th className="text-right p-2 w-20">IVA %</th>
                    <th className="text-right p-2 w-28">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const sub = Number(line.quantity || 0) * Number(line.unit_price || 0);
                    const tot = sub * (1 + Number(line.tax_rate || 0) / 100);
                    return (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="p-1"><Input value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} /></td>
                        <td className="p-1"><Input type="number" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="text-right" /></td>
                        <td className="p-1"><Input type="number" value={line.unit_price} onChange={(e) => updateLine(idx, 'unit_price', e.target.value)} className="text-right" /></td>
                        <td className="p-1"><Input type="number" value={line.tax_rate} onChange={(e) => updateLine(idx, 'tax_rate', e.target.value)} className="text-right" /></td>
                        <td className="p-2 text-right font-medium">{formatEuro(tot)}</td>
                        <td className="p-1">
                          <button onClick={() => removeLine(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr className="border-t border-slate-200">
                    <td className="p-2 text-right" colSpan={4}>Subtotal</td>
                    <td className="p-2 text-right">{formatEuro(totals.subtotal)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td className="p-2 text-right" colSpan={4}>IVA</td>
                    <td className="p-2 text-right">{formatEuro(totals.tax_amount)}</td>
                    <td></td>
                  </tr>
                  <tr className="text-base">
                    <td className="p-2 text-right" colSpan={4}>Total</td>
                    <td className="p-2 text-right">{formatEuro(totals.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel·lar</Button>
            <Button className="flex-1" onClick={save} disabled={saving || !header.client_name}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Desant...</> : 'Desar factura'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
