import React from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillingSchedules, useRunBillingSchedule, useRunDueSchedules } from '@/lib/useFinanceData';
import { formatEuro, formatDate, BILLING_FREQUENCY_LABELS } from '@/lib/finance';

export default function Billing() {
  const { data: schedules = [], isLoading } = useBillingSchedules();
  const runOne = useRunBillingSchedule();
  const runDue = useRunDueSchedules();

  const today = new Date().toISOString().slice(0, 10);
  const due = schedules.filter((s) => s.is_active && s.next_run_date <= today);
  const upcoming = schedules.filter((s) => s.is_active && s.next_run_date > today);
  const paused = schedules.filter((s) => !s.is_active);

  const mrr = schedules
    .filter((s) => s.is_active && s.frequency === 'monthly')
    .reduce((acc, s) => acc + Number(s.amount), 0);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cobraments recurrents</h1>
          <p className="text-sm text-slate-500">
            {schedules.length} plans · MRR actiu {formatEuro(mrr)} · {due.length} vençuts pendents de generar
          </p>
        </div>
        <Button
          disabled={runDue.isPending || due.length === 0}
          onClick={() => runDue.mutate()}
        >
          {runDue.isPending ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Processant...</> : <><PlayCircle className="w-4 h-4 mr-1" /> Generar tots els vençuts ({due.length})</>}
        </Button>
      </header>

      {runDue.data?.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {runDue.data.length} factures generades correctament.
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Carregant...</div>
      ) : (
        <>
          <Section title={`Vençuts (${due.length})`} emptyText="Cap cobrament vençut." accent="red">
            {due.map((s) => <ScheduleRow key={s.id} schedule={s} onRun={() => runOne.mutate(s.id)} running={runOne.isPending} />)}
          </Section>

          <Section title={`Pròxims (${upcoming.length})`} emptyText="No hi ha cobraments programats." accent="slate">
            {upcoming.map((s) => <ScheduleRow key={s.id} schedule={s} onRun={() => runOne.mutate(s.id)} running={runOne.isPending} />)}
          </Section>

          {paused.length > 0 && (
            <Section title={`Pausats (${paused.length})`} emptyText="" accent="slate">
              {paused.map((s) => <ScheduleRow key={s.id} schedule={s} onRun={() => runOne.mutate(s.id)} running={runOne.isPending} />)}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, accent, emptyText, children }) {
  const items = React.Children.toArray(children);
  const accents = {
    red: 'border-red-200',
    slate: 'border-slate-200',
  };
  return (
    <section className={`bg-white rounded-xl border ${accents[accent]} overflow-hidden`}>
      <h2 className="text-sm font-semibold text-slate-900 p-4 border-b border-slate-100">{title}</h2>
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-slate-100">{items}</div>
      )}
    </section>
  );
}

function ScheduleRow({ schedule, onRun, running }) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = schedule.is_active && schedule.next_run_date <= today;
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900">{schedule.description}</p>
        <p className="text-xs text-slate-500">
          {formatEuro(schedule.amount)} · {BILLING_FREQUENCY_LABELS[schedule.frequency]} ·{' '}
          <Link to={`/ClientDetail?id=${schedule.lead_id}`} className="text-blue-600 hover:underline">
            Veure client
          </Link>
        </p>
      </div>
      <div className="text-right flex items-center gap-3">
        <div>
          <p className="text-[10px] uppercase text-slate-500">Pròxim cobrament</p>
          <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
            {isOverdue && <AlertCircle className="w-3 h-3 inline mr-1" />}
            {formatDate(schedule.next_run_date)}
          </p>
        </div>
        {schedule.is_active && (
          <Button size="sm" variant="outline" onClick={onRun} disabled={running}>
            <PlayCircle className="w-4 h-4 mr-1" /> Generar
          </Button>
        )}
      </div>
    </div>
  );
}
