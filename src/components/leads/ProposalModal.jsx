import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  FilePlus2,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Save,
  Send,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import enllacLogo from '@/assets/enllac-digital-logo.svg';
import {
  buildDefaultProposalSections,
  calculatePricingRow,
  calculatePricingTotals,
  DEFAULT_TEMPLATE_NAME,
  getProposalClientName,
  PROPOSAL_STATUS_LABELS,
  serializeProposalForCopy,
} from '@/lib/proposalUtils';

const templates = [
  {
    key: 'default_enllac_assistent',
    name: DEFAULT_TEMPLATE_NAME,
    description: 'Plantilla principal inspirada en la proposta de referència d’Enllaç Digital.',
  },
];

const emptyArrayFallback = (arr, fallback) => (Array.isArray(arr) && arr.length > 0 ? arr : fallback);

export default function ProposalModal({ lead, proposal: sourceProposal, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(sourceProposal?.template_name || templates[0].name);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(sourceProposal ? 'preview' : 'edit');
  const [proposalId, setProposalId] = useState(sourceProposal?.id || null);

  const defaults = useMemo(() => buildDefaultProposalSections(lead), [lead]);

  const [form, setForm] = useState(() => ({
    ...defaults,
    ...sourceProposal,
    client_name: sourceProposal?.client_name || getProposalClientName(lead),
    template_name: sourceProposal?.template_name || templates[0].name,
    solution_items: emptyArrayFallback(sourceProposal?.solution_items, defaults.solution_items),
    implementation_steps: emptyArrayFallback(sourceProposal?.implementation_steps, defaults.implementation_steps),
    expected_results: emptyArrayFallback(sourceProposal?.expected_results, defaults.expected_results),
    process_steps: emptyArrayFallback(sourceProposal?.process_steps, defaults.process_steps),
    pricing_rows: emptyArrayFallback(sourceProposal?.pricing_rows, defaults.pricing_rows),
    contact_block: {
      ...defaults.contact_block,
      ...(sourceProposal?.contact_block || {}),
    },
    status: sourceProposal?.status || 'draft',
    generated_from_lead: sourceProposal?.generated_from_lead ?? true,
  }));

  const pricingRows = useMemo(() => form.pricing_rows.map(calculatePricingRow), [form.pricing_rows]);
  const pricingTotals = useMemo(() => calculatePricingTotals(pricingRows), [pricingRows]);

  const setListItem = (key, index, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addListItem = (key) => setForm((prev) => ({ ...prev, [key]: [...(prev[key] || []), ''] }));

  const removeListItem = (key, index) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const generateFromTemplate = async () => {
    setGenerating(true);
    const generated = buildDefaultProposalSections(lead);
    setForm((prev) => ({
      ...prev,
      ...generated,
      template_name: selectedTemplate,
      client_name: getProposalClientName(lead),
      generated_from_lead: true,
      status: 'draft',
      version: Number(prev.version || 1),
    }));

    await base44.entities.Activity.create({
      lead_id: lead.id,
      project_id: lead.project_id || 'enllac_digital',
      type: 'proposal',
      subject: 'Proposta generada des de plantilla',
      summary: `Plantilla aplicada: ${selectedTemplate}`,
      activity_date: new Date().toISOString(),
      auto_generated: true,
    });

    setGenerating(false);
    setViewMode('edit');
  };

  const persistProposal = async (status) => {
    setSaving(true);
    const payload = {
      ...form,
      lead_id: lead.id,
      project_id: lead.project_id || 'enllac_digital',
      template_name: selectedTemplate,
      pricing_rows: pricingRows,
      status,
      title: form.title || `Proposta d’assistent digital per a ${form.cover_sector_label || 'la teva empresa'}`,
      sent_date: status === 'sent' ? (form.sent_date || format(new Date(), 'yyyy-MM-dd')) : form.sent_date,
      version: Number(form.version || 1),
      generated_from_lead: true,
      proposal_total: pricingTotals.total,
    };

    let saved;
    if (proposalId) {
      saved = await base44.entities.Proposal.update(proposalId, payload);
    } else {
      saved = await base44.entities.Proposal.create(payload);
      setProposalId(saved?.id);
    }

    const leadPatch = {
      proposal_status: status,
      proposal_date: lead.proposal_date || format(new Date(), 'yyyy-MM-dd'),
      proposal_amount: pricingTotals.total,
      pipeline_status: status === 'sent' ? 'propuesta_enviada' : lead.pipeline_status,
    };

    await base44.entities.Lead.update(lead.id, leadPatch);

    if (status === 'sent') {
      await base44.entities.Task.create({
        title: `Follow-up proposta: ${payload.title}`,
        description: 'Revisar resposta del client després de l’enviament de la proposta.',
        lead_id: lead.id,
        project_id: lead.project_id || 'enllac_digital',
        due_date: format(new Date(Date.now() + 5 * 86400000), 'yyyy-MM-dd'),
        type: 'propuesta',
        priority: 'alta',
        source: 'crm_rule',
        completed: false,
      });
    }

    await base44.entities.Activity.create({
      lead_id: lead.id,
      project_id: lead.project_id || 'enllac_digital',
      type: 'proposal',
      subject: `Proposta ${PROPOSAL_STATUS_LABELS[status]?.toLowerCase() || status}`,
      summary: payload.title,
      activity_date: new Date().toISOString(),
      auto_generated: true,
    });

    setForm((prev) => ({ ...prev, ...payload }));
    setSaving(false);
  };

  const duplicateProposal = async () => {
    const copyPayload = {
      ...form,
      id: undefined,
      lead_id: lead.id,
      project_id: lead.project_id || 'enllac_digital',
      status: 'draft',
      version: Number(form.version || 1) + 1,
      pricing_rows: pricingRows,
      template_name: selectedTemplate,
      generated_from_lead: true,
    };

    await base44.entities.Proposal.create(copyPayload);
    await base44.entities.Activity.create({
      lead_id: lead.id,
      type: 'proposal',
      subject: 'Proposta duplicada',
      summary: `${copyPayload.title} (v${copyPayload.version})`,
      activity_date: new Date().toISOString(),
      auto_generated: true,
    });
  };

  const copyContent = async () => {
    await navigator.clipboard.writeText(serializeProposalForCopy({ ...form, pricing_rows: pricingRows }));
  };

  const updatePricingBase = (index, value) => {
    const parsed = Number(value || 0);
    setForm((prev) => ({
      ...prev,
      pricing_rows: prev.pricing_rows.map((row, i) => (i === index ? { ...row, base_imposable: parsed } : row)),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900">{sourceProposal ? 'Editar proposta' : 'Crear proposta'}</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={viewMode === 'edit' ? 'default' : 'outline'} onClick={() => setViewMode('edit')}><Pencil className="w-4 h-4 mr-1" />Editor</Button>
            <Button size="sm" variant={viewMode === 'preview' ? 'default' : 'outline'} onClick={() => setViewMode('preview')}><Eye className="w-4 h-4 mr-1" />Vista prèvia</Button>
            <button onClick={onClose}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {viewMode === 'edit' && (
          <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-3">
              {!sourceProposal && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">Plantilla</p>
                  <select className="mt-1 w-full border rounded-md px-3 py-2 text-sm" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
                    {templates.map((template) => <option key={template.key} value={template.name}>{template.name}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">{templates.find((t) => t.name === selectedTemplate)?.description}</p>
                  <Button size="sm" className="mt-2" onClick={generateFromTemplate} disabled={generating}>{generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generant...</> : <><FilePlus2 className="w-4 h-4 mr-1" />Generar des de plantilla</>}</Button>
                </div>
              )}

              <Field label="Nom del client"><Input value={form.client_name || ''} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} /></Field>
              <Field label="Títol de la proposta"><Input value={form.title || ''} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Field>
              <Field label="Subtítol"><Textarea value={form.subtitle || ''} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} /></Field>
              <Field label="Plantejament"><Textarea rows={5} value={form.plantejament || ''} onChange={(e) => setForm((p) => ({ ...p, plantejament: e.target.value, summary: e.target.value }))} /></Field>

              <EditableList title="Què inclou la solució" items={form.solution_items || []} onAdd={() => addListItem('solution_items')} onRemove={(index) => removeListItem('solution_items', index)} onChange={(index, value) => setListItem('solution_items', index, value)} />
              <EditableList title="Implantació i posada en marxa" items={form.implementation_steps || []} onAdd={() => addListItem('implementation_steps')} onRemove={(index) => removeListItem('implementation_steps', index)} onChange={(index, value) => setListItem('implementation_steps', index, value)} />

              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-sm font-semibold">Condicions econòmiques</p>
                {(form.pricing_rows || []).map((row, idx) => {
                  const calc = calculatePricingRow(row);
                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                      <Field label="Concepte"><Input value={row.concepte || ''} onChange={(e) => setForm((p) => ({ ...p, pricing_rows: p.pricing_rows.map((it, i) => i === idx ? { ...it, concepte: e.target.value } : it) }))} /></Field>
                      <Field label="Base imposable"><Input type="number" value={row.base_imposable ?? 0} onChange={(e) => updatePricingBase(idx, e.target.value)} /></Field>
                      <Field label="IVA 21%"><Input value={calc.iva} readOnly /></Field>
                      <Field label="Total"><Input value={calc.total} readOnly /></Field>
                      <Button variant="outline" size="sm" onClick={() => removeListItem('pricing_rows', idx)}>Eliminar</Button>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => setForm((p) => ({ ...p, pricing_rows: [...(p.pricing_rows || []), { concepte: '', base_imposable: 0 }] }))}><Plus className="w-4 h-4 mr-1" />Afegir fila</Button>
                <div className="text-sm text-slate-600">
                  <p>Base total: <strong>{pricingTotals.base.toFixed(2)}€</strong></p>
                  <p>IVA total: <strong>{pricingTotals.iva.toFixed(2)}€</strong></p>
                  <p>Total: <strong>{pricingTotals.total.toFixed(2)}€</strong></p>
                </div>
              </div>

              <EditableList title="Resultat esperat" items={form.expected_results || []} onAdd={() => addListItem('expected_results')} onRemove={(index) => removeListItem('expected_results', index)} onChange={(index, value) => setListItem('expected_results', index, value)} />
              <EditableList title="Procés de treball" items={form.process_steps || []} onAdd={() => addListItem('process_steps')} onRemove={(index) => removeListItem('process_steps', index)} onChange={(index, value) => setListItem('process_steps', index, value)} numbered />

              <div className="rounded-xl border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                <Field label="Contacte (persona)"><Input value={form.contact_block?.persona || ''} onChange={(e) => setForm((p) => ({ ...p, contact_block: { ...p.contact_block, persona: e.target.value } }))} /></Field>
                <Field label="Contacte (email)"><Input value={form.contact_block?.email || ''} onChange={(e) => setForm((p) => ({ ...p, contact_block: { ...p.contact_block, email: e.target.value } }))} /></Field>
                <Field label="Contacte (telèfon)"><Input value={form.contact_block?.phone || ''} onChange={(e) => setForm((p) => ({ ...p, contact_block: { ...p.contact_block, phone: e.target.value } }))} /></Field>
                <Field label="Model de servei"><Input value={form.contact_block?.model_servei || ''} onChange={(e) => setForm((p) => ({ ...p, contact_block: { ...p.contact_block, model_servei: e.target.value } }))} /></Field>
              </div>

              <Field label="Notes internes"><Textarea rows={4} value={form.notes || ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
            </div>

            <div className="space-y-2">
              <StatusPill status={form.status} />
              <Button className="w-full" onClick={() => persistProposal('draft')} disabled={saving}><Save className="w-4 h-4 mr-1" />Desa esborrany</Button>
              <Button className="w-full" variant="outline" onClick={() => persistProposal('ready')} disabled={saving}><Check className="w-4 h-4 mr-1" />Marcar com preparada</Button>
              <Button className="w-full" variant="outline" onClick={() => persistProposal('sent')} disabled={saving}><Send className="w-4 h-4 mr-1" />Marcar com enviada</Button>
              <Button className="w-full" variant="outline" onClick={() => persistProposal('accepted')} disabled={saving}>Marcar com acceptada</Button>
              <Button className="w-full" variant="outline" onClick={() => persistProposal('rejected')} disabled={saving}>Marcar com rebutjada</Button>
              <Button className="w-full" variant="outline" onClick={duplicateProposal}>Duplicar proposta</Button>
              <Button className="w-full" variant="outline" onClick={copyContent}><Copy className="w-4 h-4 mr-1" />Copiar contingut</Button>
              <Button className="w-full" variant="outline" onClick={() => { setViewMode('preview'); window.setTimeout(() => window.print(), 250); }}><Printer className="w-4 h-4 mr-1" />Exportar PDF</Button>
            </div>
          </div>
        )}

        {viewMode === 'preview' && <ProposalPreview proposal={{ ...form, pricing_rows: pricingRows }} />}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  return <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 inline-flex">Estat: {PROPOSAL_STATUS_LABELS[status] || status}</div>;
}

function Field({ label, children }) {
  return <div><p className="text-xs text-slate-500 mb-1">{label}</p>{children}</div>;
}

function EditableList({ title, items, onAdd, onRemove, onChange, numbered = false }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold mb-2">{title}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-6">{numbered ? `${index + 1}.` : '•'}</span>
            <Input value={item} onChange={(e) => onChange(index, e.target.value)} />
            <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>X</Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-2" onClick={onAdd}><Plus className="w-4 h-4 mr-1" />Afegir</Button>
    </div>
  );
}

function ProposalPreview({ proposal }) {
  const totals = calculatePricingTotals(proposal.pricing_rows || []);

  return (
    <div className="p-6 md:p-10 bg-slate-100 print:bg-white">
      <article className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-8 space-y-6 print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-4">
          <img src={enllacLogo} alt="Enllaç Digital" className="h-12 object-contain" />
          <p className="text-2xl font-bold text-slate-900 mt-4">{proposal.title}</p>
          <p className="text-lg text-slate-700 mt-1">{proposal.client_name}</p>
          <p className="text-sm text-slate-500 mt-2">{proposal.subtitle}</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
            <p><strong>Contacte:</strong> {proposal.contact_block?.persona} · {proposal.contact_block?.email}</p>
            <p><strong>Model de servei:</strong> {proposal.contact_block?.model_servei}</p>
            <p><strong>Document:</strong> {proposal.contact_block?.tipus_document || 'Document de proposta'}</p>
            <p><strong>Data:</strong> {proposal.contact_block?.generated_on || format(new Date(), 'yyyy-MM-dd')}</p>
          </div>
        </header>

        <Section title="Plantejament"><p className="text-sm whitespace-pre-wrap">{proposal.plantejament || proposal.summary}</p></Section>
        <Section title="Què inclou la solució"><ul className="list-disc ml-5 text-sm space-y-1">{(proposal.solution_items || []).map((item, i) => <li key={i}>{item}</li>)}</ul></Section>
        <Section title="Implantació i posada en marxa"><ul className="list-disc ml-5 text-sm space-y-1">{(proposal.implementation_steps || []).map((item, i) => <li key={i}>{item}</li>)}</ul></Section>

        <Section title="Condicions econòmiques">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-1">Concepte</th>
                <th className="py-1">Base imposable</th>
                <th className="py-1">IVA 21%</th>
                <th className="py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {(proposal.pricing_rows || []).map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-1">{row.concepte}</td>
                  <td className="py-1">{Number(row.base_imposable || 0).toFixed(2)}€</td>
                  <td className="py-1">{Number(row.iva || 0).toFixed(2)}€</td>
                  <td className="py-1 font-semibold">{Number(row.total || 0).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td>Total</td>
                <td>{totals.base.toFixed(2)}€</td>
                <td>{totals.iva.toFixed(2)}€</td>
                <td>{totals.total.toFixed(2)}€</td>
              </tr>
            </tfoot>
          </table>
        </Section>

        <Section title="Resultat esperat"><ul className="list-disc ml-5 text-sm space-y-1">{(proposal.expected_results || []).map((item, i) => <li key={i}>{item}</li>)}</ul></Section>
        <Section title="Procés de treball"><ol className="list-decimal ml-5 text-sm space-y-1">{(proposal.process_steps || []).map((item, i) => <li key={i}>{item}</li>)}</ol></Section>

        <Section title="Contacte">
          <div className="text-sm text-slate-700">
            <p>{proposal.contact_block?.empresa || 'Enllaç Digital'}</p>
            <p>{proposal.contact_block?.persona}</p>
            <p>{proposal.contact_block?.email} · {proposal.contact_block?.phone}</p>
            <p>{proposal.contact_block?.website}</p>
          </div>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
      {children}
    </section>
  );
}
