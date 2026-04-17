import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pencil, CreditCard, Trash2, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInvoice, useUpdateInvoice, useDeletePayment } from '@/lib/useFinanceData';
import {
  formatEuro,
  formatDate,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
} from '@/lib/finance';
import InvoiceEditorModal from '@/components/finance/InvoiceEditorModal';
import PaymentModal from '@/components/finance/PaymentModal';

export default function InvoiceDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const update = useUpdateInvoice();
  const deletePayment = useDeletePayment();
  const [showEditor, setShowEditor] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  if (isLoading || !invoice) return <div className="p-8 text-center text-slate-400">Carregant factura...</div>;

  const changeStatus = async (status) => {
    await update.mutateAsync({ id: invoice.id, patch: { status } });
  };

  return (
    <div className="space-y-4">
      <Link to="/Invoices" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Tornar a factures
      </Link>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Factura {invoice.number}</h1>
          <p className="text-sm text-slate-500">
            Emesa {formatDate(invoice.issue_date)} · Venç {formatDate(invoice.due_date)}
          </p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${INVOICE_STATUS_STYLES[invoice.status]}`}>
          {INVOICE_STATUS_LABELS[invoice.status]}
        </span>
      </header>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setShowEditor(true)}>
          <Pencil className="w-4 h-4 mr-1" /> Editar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowPayment(true)} disabled={invoice.status === 'paid'}>
          <CreditCard className="w-4 h-4 mr-1" /> Registrar pagament
        </Button>
        {invoice.status === 'draft' && (
          <Button size="sm" variant="outline" onClick={() => changeStatus('issued')}>
            Marcar com emesa
          </Button>
        )}
        {['draft', 'issued'].includes(invoice.status) && (
          <Button size="sm" variant="outline" onClick={() => changeStatus('sent')}>
            <Send className="w-4 h-4 mr-1" /> Marcar com enviada
          </Button>
        )}
        {invoice.status !== 'void' && invoice.status !== 'paid' && (
          <Button size="sm" variant="outline" onClick={() => changeStatus('void')}>
            <XCircle className="w-4 h-4 mr-1" /> Anul·lar
          </Button>
        )}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Info label="Client" value={invoice.client_name} />
          <Info label="NIF" value={invoice.client_nif || '-'} />
          <Info label="Email" value={invoice.client_email || '-'} />
          <Info label="Tipus" value={invoice.kind} />
          <Info label="Subtotal" value={formatEuro(invoice.subtotal)} />
          <Info label="IVA" value={formatEuro(invoice.tax_amount)} />
          <Info label="Total" value={formatEuro(invoice.total)} strong />
          <Info label="Pagat" value={formatEuro(invoice.amount_paid)} />
          <Info label="Pendent" value={formatEuro(invoice.amount_due)} strong />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <h2 className="text-sm font-semibold text-slate-900 p-4 border-b border-slate-100">Línies</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Descripció</th>
              <th className="text-right p-3">Qt.</th>
              <th className="text-right p-3">Preu</th>
              <th className="text-right p-3">IVA</th>
              <th className="text-right p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines || []).map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="p-3">{l.description}</td>
                <td className="p-3 text-right">{l.quantity}</td>
                <td className="p-3 text-right">{formatEuro(l.unit_price)}</td>
                <td className="p-3 text-right">{formatEuro(l.line_tax)}</td>
                <td className="p-3 text-right font-medium">{formatEuro(l.line_total)}</td>
              </tr>
            ))}
            {!invoice.lines?.length && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">Sense línies</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Pagaments ({invoice.payments?.length || 0})</h2>
          <Button size="sm" variant="outline" onClick={() => setShowPayment(true)} disabled={invoice.status === 'paid'}>
            <CreditCard className="w-4 h-4 mr-1" /> Afegir pagament
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Data</th>
              <th className="text-right p-3">Import</th>
              <th className="text-left p-3">Mètode</th>
              <th className="text-left p-3">Referència</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(invoice.payments || []).map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3">{formatDate(p.paid_at)}</td>
                <td className="p-3 text-right font-medium text-emerald-700">{formatEuro(p.amount)}</td>
                <td className="p-3">{PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
                <td className="p-3 text-slate-600">{p.reference || '-'}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => deletePayment.mutate(p.id)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                    title="Eliminar pagament"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!invoice.payments?.length && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">Encara sense pagaments registrats</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {invoice.notes && (
        <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase text-slate-500 mb-1">Notes</p>
          <p className="text-sm whitespace-pre-wrap text-slate-700">{invoice.notes}</p>
        </section>
      )}

      {showEditor && (
        <InvoiceEditorModal
          invoice={invoice}
          lead={{ id: invoice.lead_id, account_id: invoice.account_id, project_id: invoice.project_id }}
          onClose={() => setShowEditor(false)}
        />
      )}
      {showPayment && <PaymentModal invoice={invoice} onClose={() => setShowPayment(false)} />}
    </div>
  );
}

function Info({ label, value, strong }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className={`mt-0.5 ${strong ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}
