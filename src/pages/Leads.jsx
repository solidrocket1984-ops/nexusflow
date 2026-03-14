import React, { useState } from 'react';
import { useLeads, useProjects } from '../components/shared/useAppData';
import LeadRow from '../components/leads/LeadRow';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

export default function Leads() {
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tempFilter, setTempFilter] = useState('all');

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase());
    const matchProject = projectFilter === 'all' || l.project_id === projectFilter;
    const matchStatus = statusFilter === 'all' || l.pipeline_status === statusFilter;
    const matchTemp = tempFilter === 'all' || l.temperature === tempFilter;
    return matchSearch && matchProject && matchStatus && matchTemp;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500 mt-1">{leads.length} leads en total</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o empresa..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="nuevo">Nuevo</SelectItem>
              <SelectItem value="contactado">Contactado</SelectItem>
              <SelectItem value="pendiente_respuesta">Pend. respuesta</SelectItem>
              <SelectItem value="reunion_agendada">Reunión agendada</SelectItem>
              <SelectItem value="propuesta_enviada">Propuesta enviada</SelectItem>
              <SelectItem value="negociacion">Negociación</SelectItem>
              <SelectItem value="ganado">Ganado</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tempFilter} onValueChange={setTempFilter}>
            <SelectTrigger className="w-full lg:w-36">
              <SelectValue placeholder="Temperatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="frio">Frío</SelectItem>
              <SelectItem value="templado">Templado</SelectItem>
              <SelectItem value="caliente">Caliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">No se encontraron leads</div>
        )}
        {filtered.map(lead => (
          <LeadRow key={lead.id} lead={lead} projects={projects} />
        ))}
      </div>
    </div>
  );
}