import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { format } from 'date-fns';

export default function LogActivityModal({ lead, onClose }) {
  const [type, setType] = useState('llamada');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await base44.entities.Activity.create({
      lead_id: lead.id,
      project_id: lead.project_id,
      type,
      subject,
      summary,
      outcome,
      next_action: nextAction,
      next_action_date: nextDate || null,
      date: new Date().toISOString(),
      created_manually: true,
    });

    // Update lead's last contact and next action
    const updates = { last_contact: format(new Date(), 'yyyy-MM-dd') };
    if (nextAction) updates.next_action = nextAction;
    if (nextDate) updates.next_action_date = nextDate;
    await base44.entities.Lead.update(lead.id, updates);

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Registrar activitat</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Tipus</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="llamada">📞 Trucada</SelectItem>
                <SelectItem value="email">✉️ Email</SelectItem>
                <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                <SelectItem value="reunion">🤝 Reunió</SelectItem>
                <SelectItem value="nota">📝 Nota</SelectItem>
                <SelectItem value="propuesta">📄 Proposta</SelectItem>
                <SelectItem value="follow_up">🔄 Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Assumpte</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Breu descripció de l'activitat" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Resum</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3} placeholder="Que ha passat? Resum de la conversa..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Resultat</label>
            <Input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="Quin ha estat el resultat?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Pròxim pas</label>
              <Input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Acció a fer..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Data</label>
              <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-sm">Cancel·lar</Button>
            <Button onClick={save} disabled={saving} className="flex-1 text-sm">
              {saving ? 'Desant...' : 'Desar activitat'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}