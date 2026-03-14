import React from 'react';
import { Badge } from '@/components/ui/badge';

const pipelineConfig = {
  nuevo: { label: 'Nuevo', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  contactado: { label: 'Contactado', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  pendiente_respuesta: { label: 'Pend. respuesta', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  reunion_agendada: { label: 'Reunión agendada', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  propuesta_enviada: { label: 'Propuesta enviada', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  negociacion: { label: 'Negociación', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  ganado: { label: 'Ganado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  perdido: { label: 'Perdido', className: 'bg-red-50 text-red-700 border-red-200' },
};

const tempConfig = {
  frio: { label: '❄️ Frío', className: 'bg-sky-50 text-sky-700' },
  templado: { label: '🌤️ Templado', className: 'bg-amber-50 text-amber-700' },
  caliente: { label: '🔥 Caliente', className: 'bg-red-50 text-red-700' },
};

const priorityConfig = {
  alta: { label: 'Alta', className: 'bg-red-50 text-red-700 border-red-200' },
  media: { label: 'Media', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja: { label: 'Baja', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function PipelineBadge({ status }) {
  const config = pipelineConfig[status] || { label: status, className: 'bg-slate-50 text-slate-600' };
  return <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>{config.label}</Badge>;
}

export function TemperatureBadge({ temperature }) {
  const config = tempConfig[temperature] || { label: temperature, className: '' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${config.className}`}>{config.label}</span>;
}

export function PriorityBadge({ priority }) {
  const config = priorityConfig[priority] || { label: priority, className: '' };
  return <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>{config.label}</Badge>;
}