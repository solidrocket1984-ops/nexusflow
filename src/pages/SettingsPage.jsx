import React from 'react';
import { useProjects } from '../components/shared/useAppData';
import { Badge } from '@/components/ui/badge';
import { Info, Database, Sheet, Link2, ExternalLink } from 'lucide-react';

const sourceLabels = {
  manual: { label: 'Manual', icon: Database, color: 'bg-slate-100 text-slate-700' },
  google_sheets: { label: 'Google Sheets', icon: Sheet, color: 'bg-green-100 text-green-700' },
  base44_external: { label: 'Base44 Externa', icon: Link2, color: 'bg-indigo-100 text-indigo-700' },
};

export default function SettingsPage() {
  const { data: projects } = useProjects();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Gestiona tus integraciones y fuentes de datos</p>
      </div>

      {/* Upgrade notice */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-indigo-900">Integraciones disponibles con Builder+</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Las conexiones con Google Calendar, Google Sheets y bases de datos externas de Base44 requieren el plan Builder+. 
              Actualiza tu suscripción para activar la sincronización automática en tiempo real.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className="bg-white/80 text-indigo-700 border border-indigo-200">Google Calendar</Badge>
              <Badge className="bg-white/80 text-indigo-700 border border-indigo-200">Google Sheets</Badge>
              <Badge className="bg-white/80 text-indigo-700 border border-indigo-200">Base44 External DB</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Data sources */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Fuentes de datos por proyecto</h2>
      <div className="space-y-3">
        {projects.map(project => {
          const source = sourceLabels[project.data_source] || sourceLabels.manual;
          const SourceIcon = source.icon;
          return (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center"
                  style={{ backgroundColor: project.color }}>
                  {project.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{project.name}</h3>
                  <p className="text-xs text-slate-400">{project.description}</p>
                </div>
              </div>
              <Badge variant="outline" className={`${source.color} text-xs font-medium flex items-center gap-1`}>
                <SourceIcon className="w-3 h-3" />
                {source.label}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Integration details */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Detalle de integraciones</h2>
        
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-2">🟣 Maind — Datos manuales</h3>
          <p className="text-sm text-slate-500">Los leads y tareas se gestionan directamente en esta app. Puedes ampliar a otra fuente de datos en el futuro.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-2">🔵 Enllaç Digital — Base44 Externa</h3>
          <p className="text-sm text-slate-500">Preparado para conectar con la base de datos de otro proyecto de Base44. Con Builder+, se podrá leer datos en tiempo real desde el otro proyecto.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-2">🟡 Respondeya — Google Sheets</h3>
          <p className="text-sm text-slate-500">Preparado para sincronizar leads desde Google Sheets como CRM. Con Builder+, la importación será automática.</p>
        </div>
      </div>
    </div>
  );
}