import React, { useState } from 'react';
import { useProjects } from '../components/shared/useAppData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Info, Database, Sheet, Link2, Upload, Check, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  const handleCSVImport = async (projectId, file) => {
    if (!file) return;
    
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            leads: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  company: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" },
                  pipeline_status: { type: "string" },
                  temperature: { type: "string" },
                  priority: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.leads) {
        const leadsToCreate = result.output.leads.map(l => ({
          ...l,
          project_id: projectId,
          pipeline_status: l.pipeline_status || 'nuevo',
          temperature: l.temperature || 'frio',
          priority: l.priority || 'media'
        }));
        
        await base44.entities.Lead.bulkCreate(leadsToCreate);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        toast.success(`${leadsToCreate.length} leads importados correctamente`);
      } else {
        toast.error('Error al procesar el archivo');
      }
    } catch (error) {
      toast.error('Error al importar: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const respondeya = projects.find(p => p.name === 'Respondeya');
  const enllac = projects.find(p => p.name === 'Enllaç Digital');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Gestiona tus integraciones y fuentes de datos</p>
      </div>

      {/* Current plan notice */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Plan actual: Free</h3>
            <p className="text-sm text-amber-700 mt-1">
              Las integraciones automáticas (Google Calendar, Google Sheets, bases externas) requieren Builder+. 
              Por ahora puedes importar datos manualmente con CSV/Excel.
            </p>
          </div>
        </div>
      </div>

      {/* Respondeya - CSV Import */}
      {respondeya && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center"
                style={{ backgroundColor: respondeya.color }}>
                R
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Respondeya</h3>
                <p className="text-xs text-slate-400">Importación de leads</p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-700 text-xs">
              <Upload className="w-3 h-3 mr-1" /> CSV/Excel
            </Badge>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 mb-3">
            <p className="text-sm text-slate-700 mb-2">
              <strong>Versión actual (Free):</strong> Importa leads desde CSV o Excel
            </p>
            <p className="text-xs text-slate-500">
              Formato esperado: name, company, phone, email, pipeline_status, temperature, priority, notes
            </p>
          </div>

          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleCSVImport(respondeya.id, e.target.files[0])}
                disabled={importing}
              />
              <Button variant="outline" className="w-full" disabled={importing} asChild>
                <span>
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importar CSV/Excel
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-700">Con Builder+: Google Sheets automático</p>
                <p className="text-xs text-slate-500">Sincronización en tiempo real desde tu spreadsheet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enllaç Digital - External DB */}
      {enllac && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center"
                style={{ backgroundColor: enllac.color }}>
                E
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Enllaç Digital</h3>
                <p className="text-xs text-slate-400">Conexión a Base44 externa</p>
              </div>
            </div>
            <Badge className="bg-slate-100 text-slate-600 text-xs">
              <Link2 className="w-3 h-3 mr-1" /> No conectado
            </Badge>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-700 font-medium">Requiere Builder+</p>
                <p className="text-xs text-slate-500 mt-1">
                  Conecta con la base de datos de tu otro proyecto de Base44 para leer leads en tiempo real.
                </p>
              </div>
            </div>
            <Button variant="outline" disabled className="w-full text-xs">
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Configurar conexión (Builder+)
            </Button>
          </div>
        </div>
      )}

      {/* Google Calendar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Google Calendar</h3>
              <p className="text-xs text-slate-400">Sincronización de agenda</p>
            </div>
          </div>
          <Badge className="bg-slate-100 text-slate-600 text-xs">No conectado</Badge>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700 font-medium">Requiere Builder+</p>
              <p className="text-xs text-slate-500 mt-1">
                Sincroniza reuniones y bloques de tiempo desde tu Google Calendar para planificar mejor tu día.
              </p>
            </div>
          </div>
          <Button variant="outline" disabled className="w-full text-xs">
            <Database className="w-3.5 h-3.5 mr-1.5" />
            Conectar Google Calendar (Builder+)
          </Button>
        </div>
      </div>
    </div>
  );
}