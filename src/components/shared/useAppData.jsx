import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-updated_date'),
    initialData: [],
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date'),
    initialData: [],
  });
}

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-activity_date'),
    initialData: [],
  });
}

export function useEmailDrafts() {
  return useQuery({
    queryKey: ['email-drafts'],
    queryFn: () => base44.entities.EmailDraft.list('-updated_date'),
    initialData: [],
  });
}

export function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-updated_date'),
    initialData: [],
  });
}
