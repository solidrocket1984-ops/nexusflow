import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, RefreshCw, FileSpreadsheet, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleFileImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setLastResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.functions.invoke('importEnllacLeads', { file_url });
      const { created, updated, total } = result.data;
      setLastResult({ created, updated, total });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Sync completada: ${created} nous, ${updated} actualitzats`);
    } catch (error) {
      toast.error('Error en la importació: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Configuració</h1>
        <p className="text-sm text-slate-500 mt-1">Sincronització de dades — Enllaç Digital</p>
      </div>

      {/* Main import card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">CRM Enllaç Digital Unificat</h3>
            <p className="text-xs text-slate-400">Full: CRM Leads</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800 mb-1">Com sincronitzar:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-500">
            <li>Obre el Google Sheet <strong>CRM Enllaç Digital Unificat</strong></li>
            <li>Fitxer → Descarregar → <strong>Microsoft Excel (.xlsx)</strong></li>
            <li>Puja el fitxer aquí baix</li>
          </ol>
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Leads existents s'actualitzen per Lead ID. Nous leads s'afegeixen. No es creen duplicats.</span>
          </div>
        </div>

        <label className="block">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFileImport(e.target.files[0])}
            disabled={importing}
          />
          <Button className="w-full" disabled={importing} asChild>
            <span>
              {importing ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sincronitzant...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Pujar fitxer i sincronitzar</>
              )}
            </span>
          </Button>
        </label>

        {lastResult && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-800">Sync completada</p>
              <p className="text-emerald-700 mt-0.5">
                {lastResult.created} leads nous · {lastResult.updated} actualitzats · {lastResult.total} total processats
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}