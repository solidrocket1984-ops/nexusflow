import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, PlusSquare, Mail, FileText, Archive, Phone } from 'lucide-react';
import { useLeads } from '../components/shared/useAppData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  buildDuplicateKey,
  getDataQualityWarnings,
  isActiveInPipeline,
  isHot,
  isInactive,
  isOverdue,
  normalizeLead,
  pipelineColors,
  pipelineLabels,
  scoreLead,
  temperatureColors,
} from '../lib/crmUtils';

export default function Leads() {
  const { data: leadData = [] } = useLeads();
  const queryClient = useQueryClient();
  const leads = useMemo(() => leadData.map(normalizeLead), [leadData]);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [filters, setFilters] = useState({
    pipeline_status: 'all',
    lead_status: 'all',
    temperature: 'all',
    priority: 'all',
    urgency: 'all',
    proposal_status: 'all',
    overdue_only: false,
    inactive_only: false,
    hot_only: false,
    archived_only: false,
  });

  const filtered = useMemo(() => {
    const rows = leads.filter((lead) => {
      if (filters.archived_only && !lead.is_archived) return false;
      if (!filters.archived_only && lead.is_archived) return false;
      const query = search.toLowerCase();
      if (query && ![lead.contact_name, lead.name, lead.company, lead.email, lead.phone].some((f) => f?.toLowerCase().includes(query))) return false;
      if (filters.pipeline_status !== 'all' && lead.pipeline_status !== filters.pipeline_status) return false;
      if (filters.lead_status !== 'all' && lead.lead_status !== filters.lead_status) return false;
      if (filters.temperature !== 'all' && lead.temperature !== filters.temperature) return false;
      if (filters.priority !== 'all' && lead.priority !== filters.priority) return false;
      if (filters.urgency !== 'all' && lead.urgency !== filters.urgency) return false;
      if (filters.proposal_status !== 'all' && lead.proposal_status !== filters.proposal_status) return false;
      if (filters.overdue_only && !isOverdue(lead)) return false;
      if (filters.inactive_only && !isInactive(lead, 21)) return false;
      if (filters.hot_only && !isHot(lead)) return false;
      return true;
    });

    const sorters = {
      score: (a, b) => scoreLead(b) - scoreLead(a),
      next_action_date: (a, b) => (a.next_action_date || '9999').localeCompare(b.next_action_date || '9999'),
      priority: (a, b) => (a.priority || '').localeCompare(b.priority || ''),
      weighted_value: (a, b) => Number(b.weighted_value || 0) - Number(a.weighted_value || 0),
      days_without_activity: (a, b) => Number(b.days_without_activity || 0) - Number(a.days_without_activity || 0),
    };

    return rows.sort(sorters[sortBy]);
  }, [leads, search, filters, sortBy]);

  const duplicateMap = useMemo(() => {
    const map = new Map();
    leads.forEach((lead) => {
      const key = buildDuplicateKey(lead);
      if (!key || key === '||') return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(lead);
    });
    return [...map.entries()].filter(([, rows]) => rows.length > 1);
  }, [leads]);

  const handleLeadUpdate = async (leadId, payload) => {
    await base44.entities.Lead.update(leadId, payload);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads · Enllaç Digital</h1>
          <p className="text-sm text-slate-500">{leads.filter(isActiveInPipeline).length} actius · {filtered.length} visibles</p>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Ordenar: score</SelectItem>
            <SelectItem value="next_action_date">Pròxima acció</SelectItem>
            <SelectItem value="priority">Prioritat</SelectItem>
            <SelectItem value="weighted_value">Valor ponderat</SelectItem>
            <SelectItem value="days_without_activity">Dies inactiu</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa, contacte, email o telèfon" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <FilterSelect value={filters.pipeline_status} onValueChange={(v) => setFilters((p) => ({ ...p, pipeline_status: v }))} label="Pipeline" options={[['all', 'Tots'], ...Object.entries(pipelineLabels)]} />
          <FilterSelect value={filters.lead_status} onValueChange={(v) => setFilters((p) => ({ ...p, lead_status: v }))} label="Lead status" options={[['all', 'Tots'], ['active', 'Actiu'], ['won', 'Guanyat'], ['lost', 'Perdut']]} />
          <FilterSelect value={filters.temperature} onValueChange={(v) => setFilters((p) => ({ ...p, temperature: v }))} label="Temperatura" options={[['all', 'Totes'], ['frio', 'Fred'], ['templado', 'Temperat'], ['caliente', 'Calent']]} />
          <FilterSelect value={filters.priority} onValueChange={(v) => setFilters((p) => ({ ...p, priority: v }))} label="Prioritat" options={[['all', 'Totes'], ['alta', 'Alta'], ['media', 'Mitja'], ['baja', 'Baixa']]} />
          <FilterSelect value={filters.urgency} onValueChange={(v) => setFilters((p) => ({ ...p, urgency: v }))} label="Urgència" options={[['all', 'Totes'], ['alta', 'Alta'], ['media', 'Mitja'], ['baja', 'Baixa']]} />
          <FilterSelect value={filters.proposal_status} onValueChange={(v) => setFilters((p) => ({ ...p, proposal_status: v }))} label="Proposta" options={[['all', 'Totes'], ['none', 'Cap'], ['draft', 'Esborrany'], ['sent', 'Enviada'], ['accepted', 'Acceptada'], ['rejected', 'Rebutjada']]} />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <ToggleChip active={filters.overdue_only} onClick={() => setFilters((p) => ({ ...p, overdue_only: !p.overdue_only }))}>Vençudes</ToggleChip>
          <ToggleChip active={filters.inactive_only} onClick={() => setFilters((p) => ({ ...p, inactive_only: !p.inactive_only }))}>Inactives</ToggleChip>
          <ToggleChip active={filters.hot_only} onClick={() => setFilters((p) => ({ ...p, hot_only: !p.hot_only }))}>Calentes</ToggleChip>
          <ToggleChip active={filters.archived_only} onClick={() => setFilters((p) => ({ ...p, archived_only: !p.archived_only }))}>Arxivades</ToggleChip>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && <div className="p-8 text-center text-slate-400">No s'han trobat leads</div>}
        {filtered.map((lead) => {
          const warnings = getDataQualityWarnings(lead);
          return (
            <div key={lead.id} className="p-3 lg:p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link className="text-sm font-semibold text-slate-900 hover:text-blue-600" to={`/LeadDetail?id=${lead.id}`}>{lead.contact_name || lead.name || lead.company}</Link>
                  <p className="text-xs text-slate-500">{lead.company || 'Sense empresa'} · {lead.email || lead.phone || 'Sense contacte'}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">score {scoreLead(lead)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full text-white" style={{ backgroundColor: pipelineColors[lead.pipeline_status] || '#64748b' }}>{pipelineLabels[lead.pipeline_status] || lead.pipeline_status}</span>
                {lead.temperature && <span className={`text-[10px] px-2 py-1 rounded-full ${temperatureColors[lead.temperature]?.bg} ${temperatureColors[lead.temperature]?.text}`}>{temperatureColors[lead.temperature]?.label || lead.temperature}</span>}
                {isOverdue(lead) && <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700">Next action vençuda</span>}
                {warnings.length > 0 && <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700">⚠ {warnings.length} alerta qualitat</span>}
              </div>
              {warnings.length > 0 && <p className="text-xs text-amber-700">{warnings.join(' · ')}</p>}
              <div className="flex flex-wrap gap-1">
                <QuickAction to={`/LeadDetail?id=${lead.id}`}>Obrir</QuickAction>
                <QuickButton onClick={() => handleLeadUpdate(lead.id, { lead_status: 'won', pipeline_status: 'ganado' })}>Marcar guanyat</QuickButton>
                <QuickButton onClick={() => handleLeadUpdate(lead.id, { lead_status: 'lost', pipeline_status: 'perdido' })}>Marcar perdut</QuickButton>
                <QuickButton onClick={() => handleLeadUpdate(lead.id, { is_archived: true, archive_reason: 'manual_archive' })}><Archive className="w-3 h-3 mr-1" />Arxivar</QuickButton>
                <QuickAction to={`/LeadDetail?id=${lead.id}&tab=activity`}><Phone className="w-3 h-3 mr-1" />Activitat</QuickAction>
                <QuickAction to={`/LeadDetail?id=${lead.id}&tab=emails`}><Mail className="w-3 h-3 mr-1" />Email</QuickAction>
                <QuickAction to={`/LeadDetail?id=${lead.id}&tab=proposals`}><FileText className="w-3 h-3 mr-1" />Proposta</QuickAction>
                <QuickAction to={`/LeadDetail?id=${lead.id}&tab=tasks`}><PlusSquare className="w-3 h-3 mr-1" />Tasca</QuickAction>
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Duplicate review</h2>
        {duplicateMap.length === 0 && <p className="text-sm text-slate-500">No s'han detectat duplicats probables.</p>}
        <div className="space-y-3">
          {duplicateMap.map(([key, entries]) => (
            <div key={key} className="border border-slate-200 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Key: {key}</p>
              <div className="space-y-2">
                {entries.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between">
                    <Link className="text-sm text-slate-800 hover:text-blue-600" to={`/LeadDetail?id=${lead.id}`}>{lead.contact_name || lead.company}</Link>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleLeadUpdate(lead.id, { is_archived: true, archive_reason: 'duplicate' })}>Arxivar duplicat</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleLeadUpdate(lead.id, { archive_reason: 'not_duplicate_reviewed' })}>No duplicat</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterSelect({ value, onValueChange, label, options }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        {options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-2 py-1 rounded-full border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
      {children}
    </button>
  );
}

function QuickAction({ to, children }) {
  return <Link to={to} className="inline-flex items-center text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">{children}</Link>;
}

function QuickButton({ onClick, children }) {
  return <button onClick={onClick} className="inline-flex items-center text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"><AlertTriangle className="w-3 h-3 mr-1 opacity-0" />{children}</button>;
}
