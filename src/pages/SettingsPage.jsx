import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, RefreshCw, Database, ShieldCheck } from 'lucide-react';
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
      setLastResult({ created, updated, total, date: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Importació completada: ${created} nous, ${updated} actualitzats.`);
    } catch (error) {
      toast.error('Error en la importació: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Configuració CRM</h1>
        <p className="text-sm text-slate-500">Administració operativa d'Enllaç Digital.</p>
      </header>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Source of truth</h2>
        </div>
        <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
          <li>Negoci únic: <strong>Enllaç Digital</strong>.</li>
          <li>Font actual: <strong>CRM Enllaç Digital Unificat</strong> (fitxer importat manualment).</li>
          <li>Mode de sincronització: <strong>manual</strong> (no hi ha live sync automàtic en aquest app).</li>
        </ul>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Importació / actualització de leads</h2>
        <p className="text-xs text-slate-500">Puja un Excel/CSV exportat del full de leads per crear o actualitzar registres.</p>
        <label className="block">
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFileImport(e.target.files[0])} disabled={importing} />
          <Button className="w-full" disabled={importing} asChild>
            <span>{importing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Important...</> : <><Upload className="w-4 h-4 mr-2" />Pujar fitxer i actualitzar CRM</>}</span>
          </Button>
        </label>
        {lastResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            <div>{lastResult.created} creats · {lastResult.updated} actualitzats · {lastResult.total} processats.</div>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Safeguards de duplicats</h2>
        </div>
        <p className="text-xs text-slate-500">El CRM genera i utilitza <code>duplicate_key</code> per revisar possibles duplicats, sense auto-eliminar registres.</p>
      </section>
    </div>
  );
}
