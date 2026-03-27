import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  buildDefaultProposalSections,
  calculateProposalTotals,
  calculatePricingRow,
  serializeProposalPayload,
} from '@/lib/proposalUtils';

import enllacLogo from '@/assets/enllac-digital-logo.svg';

export default function ProposalModal({ lead, proposal, onClose }) {
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const initialValues = useMemo(() => {
    if (proposal) {
      return {
        title: proposal.title || '',
        client_name: proposal.client_name || '',
        subtitle: proposal.subtitle || '',
        summary: proposal.summary || '',
        plantejament: proposal.plantejament || proposal.problem || '',
        included_items: proposal.included_items || proposal.solution_items || [],
        implementation_steps: proposal.implementation_steps || [],
        pricing_rows: (proposal.pricing_rows || []).map((row) => calculatePricingRow(row)),
        expected_results: proposal.expected_results || [],
        process_steps: proposal.process_steps || [],
        contact_block: proposal.contact_block || {
          phone: '686 373 615',
          email: 'xavi@enllacdigital.cat',
          service_model: 'Implantació inicial + quota mensual · Optimització i seguiment inclosos',
        },
        status: proposal.status || 'draft',
        notes: proposal.notes || '',
      };
    }

    return {
      ...buildDefaultProposalSections(lead),
      status: 'draft',
    };
  }, [lead, proposal]);

  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const totals = useMemo(
    () => calculateProposalTotals(values.pricing_rows || []),
    [values.pricing_rows]
  );

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const setArrayItem = (field, index, value) => {
    setValues((prev) => {
      const next = [...(prev[field] || [])];
      next[index] = value;
      return { ...prev, [field]: next };
    });
  };

  const addArrayItem = (field, value = '') => {
    setValues((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), value],
    }));
  };

  const removeArrayItem = (field, index) => {
    setValues((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  const setPricingRow = (index, key, value) => {
    setValues((prev) => {
      const next = [...(prev.pricing_rows || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, pricing_rows: next };
    });
  };

  const addPricingRow = () => {
    setValues((prev) => ({
      ...prev,
      pricing_rows: [...(prev.pricing_rows || []), { concept: '', base: 0, vat: 0.21 }],
    }));
  };

  const removePricingRow = (index) => {
    setValues((prev) => ({
      ...prev,
      pricing_rows: (prev.pricing_rows || []).filter((_, i) => i !== index),
    }));
  };

  const saveProposal = async (statusOverride) => {
    setSaving(true);
    try {
      const payload = serializeProposalPayload(
        {
          ...values,
          status: statusOverride || values.status || 'draft',
          pricing_rows: totals.rows,
        },
        lead
      );

      let saved;
      if (proposal?.id) {
        saved = await base44.entities.Proposal.update(proposal.id, payload);
      } else {
        saved = await base44.entities.Proposal.create(payload);
      }

      if ((statusOverride || values.status) === 'sent') {
        const today = new Date().toISOString();

        await base44.entities.Lead.update(lead.id, {
          proposal_status: 'sent',
          proposal_date: lead.proposal_date || today.slice(0, 10),
          pipeline_status: 'propuesta_enviada',
        });

        await base44.entities.Activity.create({
          lead_id: lead.id,
          type: 'proposal',
          subject: 'Proposta enviada',
          summary: payload.title,
          activity_date: today,
          auto_generated: true,
        });

        await base44.entities.Task.create({
          title: `Seguiment proposta: ${payload.title}`,
          lead_id: lead.id,
          project_id: lead.project_id,
          due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          type: 'seguiment',
          priority: 'alta',
          source: 'crm_rule',
          completed: false,
        });
      }

      onClose?.(saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-auto rounded-2xl shadow-xl border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {proposal ? 'Editar proposta' : 'Crear proposta'}
            </h2>
            <p className="text-sm text-slate-500">
              Client: {values.client_name || lead?.company || lead?.contact_name || 'Sense nom'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreview((v) => !v)}>
              {preview ? 'Editar' : 'Vista prèvia'}
            </Button>
            <Button variant="outline" onClick={onClose}>Tancar</Button>
            <Button variant="outline" disabled={saving} onClick={() => saveProposal('draft')}>
              Desa esborrany
            </Button>
            <Button disabled={saving} onClick={() => saveProposal('sent')}>
              Marcar com enviada
            </Button>
          </div>
        </div>

        {!preview ? (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="space-y-4">
              <TextField label="Títol" value={values.title} onChange={(v) => setField('title', v)} />
              <TextField label="Nom del client" value={values.client_name} onChange={(v) => setField('client_name', v)} />
              <TextField label="Subtítol" value={values.subtitle} onChange={(v) => setField('subtitle', v)} />
              <TextAreaField label="Resum" value={values.summary} onChange={(v) => setField('summary', v)} rows={3} />
              <TextAreaField label="Plantejament" value={values.plantejament} onChange={(v) => setField('plantejament', v)} rows={8} />
              <ArrayEditor
                label="Què inclou la solució"
                items={values.included_items || []}
                onAdd={() => addArrayItem('included_items')}
                onChange={(i, v) => setArrayItem('included_items', i, v)}
                onRemove={(i) => removeArrayItem('included_items', i)}
              />
              <ArrayEditor
                label="Implantació i posada en marxa"
                items={values.implementation_steps || []}
                onAdd={() => addArrayItem('implementation_steps')}
                onChange={(i, v) => setArrayItem('implementation_steps', i, v)}
                onRemove={(i) => removeArrayItem('implementation_steps', i)}
              />
            </section>

            <section className="space-y-4">
              <PricingEditor
                rows={values.pricing_rows || []}
                onChange={setPricingRow}
                onAdd={addPricingRow}
                onRemove={removePricingRow}
                totals={totals}
              />

              <ArrayEditor
                label="Resultat esperat"
                items={values.expected_results || []}
                onAdd={() => addArrayItem('expected_results')}
                onChange={(i, v) => setArrayItem('expected_results', i, v)}
                onRemove={(i) => removeArrayItem('expected_results', i)}
              />

              <ArrayEditor
                label="Procés de treball"
                items={values.process_steps || []}
                onAdd={() => addArrayItem('process_steps')}
                onChange={(i, v) => setArrayItem('process_steps', i, v)}
                onRemove={(i) => removeArrayItem('process_steps', i)}
                numbered
              />

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h3 className="font-medium text-slate-900">Contacte</h3>
                <TextField
                  label="Telèfon"
                  value={values.contact_block?.phone || ''}
                  onChange={(v) =>
                    setField('contact_block', { ...values.contact_block, phone: v })
                  }
                />
                <TextField
                  label="Correu"
                  value={values.contact_block?.email || ''}
                  onChange={(v) =>
                    setField('contact_block', { ...values.contact_block, email: v })
                  }
                />
                <TextAreaField
                  label="Model de servei"
                  value={values.contact_block?.service_model || ''}
                  onChange={(v) =>
                    setField('contact_block', { ...values.contact_block, service_model: v })
                  }
                  rows={3}
                />
              </div>

              <TextAreaField
                label="Notes internes"
                value={values.notes || ''}
                onChange={(v) => setField('notes', v)}
                rows={4}
              />
            </section>
          </div>
        ) : (
          <div className="p-6 bg-slate-50">
            <ProposalPreview values={values} totals={totals} logoSrc={enllacLogo} />
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalPreview({ values, totals, logoSrc }) {
  return (
    <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-xl p-10 space-y-8">
      <div className="text-center space-y-4">
        <img src={logoSrc} alt="Enllaç Digital" className="h-24 mx-auto object-contain" />
        <div>
          <p className="text-3xl font-semibold text-slate-700">{values.title}</p>
          <p className="text-5xl font-bold text-[#a00019] mt-3">{values.client_name}</p>
          <p className="text-xl italic text-slate-500 mt-4">{values.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-8">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="font-semibold text-[#a00019]">Contacte</p>
            <p>{values.contact_block?.phone}</p>
            <p>{values.contact_block?.email}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="font-semibold text-[#a00019]">Model de servei</p>
            <p>{values.contact_block?.service_model}</p>
          </div>
        </div>

        <p className="text-slate-500">Document de proposta</p>
      </div>

      <Section title="1. Plantejament">
        <p className="whitespace-pre-wrap">{values.plantejament}</p>
      </Section>

      <Section title="2. Què inclou la solució">
        <ul className="list-disc ml-6 space-y-1">
          {(values.included_items || []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </Section>

      <Section title="3. Implantació i posada en marxa">
        <ul className="list-disc ml-6 space-y-1">
          {(values.implementation_steps || []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </Section>

      <Section title="4. Condicions econòmiques">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 border-b">Concepte</th>
                <th className="text-right p-2 border-b">Base imposable</th>
                <th className="text-right p-2 border-b">IVA 21%</th>
                <th className="text-right p-2 border-b">Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.rows.map((row, i) => (
                <tr key={i}>
                  <td className="p-2 border-b">{row.concept}</td>
                  <td className="p-2 border-b text-right">{formatEuro(row.base)}</td>
                  <td className="p-2 border-b text-right">{formatEuro(row.vatAmount)}</td>
                  <td className="p-2 border-b text-right">{formatEuro(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{formatEuro(totals.baseTotal)}</td>
                <td className="p-2 text-right">{formatEuro(totals.vatTotal)}</td>
                <td className="p-2 text-right">{formatEuro(totals.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section title="5. Resultat esperat">
        <ul className="list-disc ml-6 space-y-1">
          {(values.expected_results || []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </Section>

      <Section title="6. Procés de treball">
        <ol className="list-decimal ml-6 space-y-1">
          {(values.process_steps || []).map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      </Section>

      <Section title="7. Contacte">
        <p>Telèfon: {values.contact_block?.phone}</p>
        <p>Correu electrònic: {values.contact_block?.email}</p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-2xl font-bold text-[#a00019]">{title}</h3>
      <div className="text-slate-700 text-base leading-7">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows = 4 }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <textarea
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        rows={rows}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ArrayEditor({ label, items, onAdd, onChange, onRemove, numbered = false }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">{label}</h3>
        <Button size="sm" variant="outline" onClick={onAdd}>Afegir</Button>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="text-sm text-slate-400 pt-2 w-6">{numbered ? `${i + 1}.` : '•'}</div>
            <textarea
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              value={item || ''}
              onChange={(e) => onChange(i, e.target.value)}
            />
            <Button size="sm" variant="outline" onClick={() => onRemove(i)}>Eliminar</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingEditor({ rows, onChange, onAdd, onRemove, totals }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">Condicions econòmiques</h3>
        <Button size="sm" variant="outline" onClick={onAdd}>Afegir línia</Button>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6">
              <TextField
                label="Concepte"
                value={row.concept}
                onChange={(v) => onChange(i, 'concept', v)}
              />
            </div>
            <div className="col-span-2">
              <TextField
                label="Base"
                value={row.base}
                onChange={(v) => onChange(i, 'base', Number(v || 0))}
              />
            </div>
            <div className="col-span-2">
              <TextField
                label="IVA"
                value={row.vat}
                onChange={(v) => onChange(i, 'vat', Number(v || 0))}
              />
            </div>
            <div className="col-span-2">
              <Button size="sm" variant="outline" onClick={() => onRemove(i)}>Eliminar</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-slate-600 space-y-1 border-t border-slate-200 pt-3">
        <p>Base total: {formatEuro(totals.baseTotal)}</p>
        <p>IVA total: {formatEuro(totals.vatTotal)}</p>
        <p className="font-semibold text-slate-900">Total: {formatEuro(totals.grandTotal)}</p>
      </div>
    </div>
  );
}

function formatEuro(value) {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}
