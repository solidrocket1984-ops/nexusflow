import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, PlayCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import {
  useContracts,
  useInvoices,
  useBillingSchedules,
  useRunBillingSchedule,
} from '@/lib/useFinanceData';
import {
  formatEuro,
  formatDate,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_STYLES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
  BILLING_FREQUENCY_LABELS,
} from '@/lib/finance';
import InvoiceEditorModal from '@/components/finance/InvoiceEditorModal';
import BillingScheduleModal from '@/components/finance/BillingScheduleModal';

export default function ClientDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');

  const { data: lead } = useQuery({
    queryKey: ['lead-with-finance', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: clientKpis } = useQuery({
    queryKey: ['crm_clients', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data } = await supabase.from('crm_clients').select('*').eq('lead_id', leadId).maybeSingle();
      return data;
    },
  });
  const { data: contracts = [] } = useContracts({ leadId });
  const { data: invoices = [] } = useInvoices({ leadId });
  const { data: schedules = [] } = useBillingSchedules({ leadId });
  const runSchedule = useRunBillingSchedule();

  const [invoiceEditor, setInvoiceEditor] = useState(null);
  const [scheduleEditor, setScheduleEditor] = useState(null);

  if (!lead) return <div className="p-8 text-center text-slate-400">Carregant client...</div>;

  return (
    <div className="space-y-4">
      <Link to="/Clients" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Tornar a clients
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-slate-900">{lead.company || lead.name}</h1>
        <p className="text-sm text-slate-500">{lead.contact_name} · {lead.email || lead.phone || '-'}</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi title="MRR" value={formatEuro(clientKpis?.mrr_amount || 0)} />
        <Kpi title="Facturat històric" value={formatEuro(clientKpis?.lifetime_billed || 0)} />
        <Kpi title="Cobrat" value={formatEuro(clientKpis?.lifetime_paid || 0)} />
        <Kpi
          title="Pendent"
          value={formatEuro(clientKpis?.outstanding_balance || 0)}
          accent={Number(clientKpis?.outstanding_balance || 0) > 0 ? 'red' : 'slate'}
        />
      </section>

      <Tabs defaultValue="contracts">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="contracts">Contractes ({contracts.length})</TabsTrigger>
          <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
          <TabsTrigger value="schedules">Cobraments recurrents ({schedules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-2 pt-3">
          {contracts.length === 0 && <Empty text="No hi ha contractes." />}
          {contracts.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{c.code} · {c.title}</p>
                  <p className="text-xs text-slate-500">
                    Signat {formatDate(c.signed_date)} · Inici {formatDate(c.start_date)} · Dia de cobrament {c.billing_day}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${CONTRACT_STATUS_STYLES[c.status]}`}>
                  {CONTRACT_STATUS_LABELS[c.status]}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                <Info label="Setup" value={formatEuro(c.setup_fee || 0)} />
                <Info label="Mensual" value={formatEuro(c.monthly_fee || 0)} />
                <Info label="Anual estimat" value={formatEuro((Number(c.setup_fee) || 0) + (Number(c.monthly_fee) || 0) * 12)} />
                <Info label="Renovació" value={c.auto_renew ? 'Automàtica' : 'Manual'} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setInvoiceEditor({ lead, contractId: c.id })}>
                  <Plus className="w-4 h-4 mr-1" /> Nova factura vinculada
                </Button>
                <Button size="sm" variant="outline" onClick={() => setScheduleEditor({ lead, contract: c })}>
                  <Plus className="w-4 h-4 mr-1" /> Nou cobrament recurrent
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-2 pt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setInvoiceEditor({ lead })}>
              <Plus className="w-4 h-4 mr-1" /> Nova factura
            </Button>
          </div>

          {invoices.length === 0 && <Empty text="No hi ha factures emeses." />}
          {invoices.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left p-3">Número</th>
                    <th className="text-left p-3">Emissió</th>
                    <th className="text-left p-3">Tipus</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-right p-3">Pendent</th>
                    <th className="p-3">Estat</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="p-3 font-medium">{inv.number}</td>
                      <td className="p-3 text-slate-600">{formatDate(inv.issue_date)}</td>
                      <td className="p-3 text-slate-600 capitalize">{inv.kind}</td>
                      <td className="p-3 text-right">{formatEuro(inv.total)}</td>
                      <td className={`p-3 text-right ${Number(inv.amount_due) > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                        {formatEuro(inv.amount_due)}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${INVOICE_STATUS_STYLES[inv.status]}`}>
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link className="text-xs text-blue-600 font-medium" to={`/InvoiceDetail?id=${inv.id}`}>
                          Obrir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-2 pt-3">
          {schedules.length === 0 && <Empty text="No hi ha cobraments recurrents actius." />}
          {schedules.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{s.description}</p>
                  <p className="text-xs text-slate-500">
                    {formatEuro(s.amount)} · {BILLING_FREQUENCY_LABELS[s.frequency]} · Pròxim: {formatDate(s.next_run_date)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {s.is_active ? 'Actiu' : 'Pausat'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setScheduleEditor({ schedule: s, lead })}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={runSchedule.isPending}
                  onClick={() => runSchedule.mutate(s.id)}
                >
                  <PlayCircle className="w-4 h-4 mr-1" /> Generar factura ara
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {invoiceEditor && (
        <InvoiceEditorModal
          lead={invoiceEditor.lead}
          contractId={invoiceEditor.contractId}
          onClose={() => setInvoiceEditor(null)}
        />
      )}
      {scheduleEditor && (
        <BillingScheduleModal
          schedule={scheduleEditor.schedule}
          lead={scheduleEditor.lead}
          contract={scheduleEditor.contract}
          onClose={() => setScheduleEditor(null)}
        />
      )}
    </div>
  );
}

function Kpi({ title, value, accent = 'slate' }) {
  const colors = {
    slate: 'bg-white border-slate-200 text-slate-900',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <p className="text-xs uppercase font-medium opacity-80">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Empty({ text }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">{text}</div>;
}
