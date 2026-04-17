import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';

// ---------- CLIENTS (vista derivada) ----------
export function useClients() {
  return useQuery({
    queryKey: ['crm_clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_clients')
        .select('*')
        .order('lead_created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useClient(leadId) {
  return useQuery({
    queryKey: ['crm_clients', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------- CONTRACTS ----------
export function useContracts({ leadId, accountId } = {}) {
  return useQuery({
    queryKey: ['contracts', { leadId, accountId }],
    queryFn: async () => {
      let q = supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (leadId) q = q.eq('lead_id', leadId);
      if (accountId) q = q.eq('account_id', accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.from('contracts').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['crm_clients'] });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase.from('contracts').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['crm_clients'] });
    },
  });
}

// ---------- INVOICES ----------
export function useInvoices({ leadId, status, limit = 200 } = {}) {
  return useQuery({
    queryKey: ['invoices', { leadId, status }],
    queryFn: async () => {
      let q = supabase
        .from('crm_invoices_enriched')
        .select('*')
        .order('issue_date', { ascending: false })
        .limit(limit);
      if (leadId) q = q.eq('lead_id', leadId);
      if (status && status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useInvoice(invoiceId) {
  return useQuery({
    queryKey: ['invoices', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data: invoice, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
      if (error) throw error;
      const { data: lines, error: lerr } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true });
      if (lerr) throw lerr;
      const { data: payments, error: perr } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('paid_at', { ascending: false });
      if (perr) throw perr;
      return { ...invoice, lines: lines || [], payments: payments || [] };
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoice, lines = [] }) => {
      const { data: inv, error } = await supabase.from('invoices').insert(invoice).select().single();
      if (error) throw error;
      if (lines.length) {
        const rows = lines.map((l, idx) => ({ ...l, invoice_id: inv.id, sort_order: idx }));
        const { error: lerr } = await supabase.from('invoice_lines').insert(rows);
        if (lerr) throw lerr;
      }
      return inv;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['crm_clients'] });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpsertInvoiceLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (line) => {
      if (line.id) {
        const { data, error } = await supabase.from('invoice_lines').update(line).eq('id', line.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('invoice_lines').insert(line).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useDeleteInvoiceLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('invoice_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

// ---------- BILLING SCHEDULES ----------
export function useBillingSchedules({ leadId, contractId, activeOnly = false } = {}) {
  return useQuery({
    queryKey: ['billing_schedules', { leadId, contractId, activeOnly }],
    queryFn: async () => {
      let q = supabase.from('billing_schedules').select('*').order('next_run_date', { ascending: true });
      if (leadId) q = q.eq('lead_id', leadId);
      if (contractId) q = q.eq('contract_id', contractId);
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertBillingSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schedule) => {
      if (schedule.id) {
        const { data, error } = await supabase
          .from('billing_schedules')
          .update(schedule)
          .eq('id', schedule.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('billing_schedules').insert(schedule).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing_schedules'] });
      qc.invalidateQueries({ queryKey: ['crm_clients'] });
    },
  });
}

// Llama a la función SQL generate_invoice_from_schedule
export function useRunBillingSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId) => {
      const { data, error } = await supabase.rpc('generate_invoice_from_schedule', {
        p_schedule_id: scheduleId,
      });
      if (error) throw error;
      return data; // invoice_id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['billing_schedules'] });
    },
  });
}

export function useRunDueSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('run_due_billing_schedules');
      if (error) throw error;
      return data || [];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['billing_schedules'] });
    },
  });
}

// ---------- PAYMENTS ----------
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment) => {
      const { data, error } = await supabase.from('payments').insert(payment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['crm_clients'] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}
