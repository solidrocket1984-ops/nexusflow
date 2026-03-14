import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    initialData: [],
  });
}

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    initialData: [],
  });
}

export function useSuggestions() {
  return useQuery({
    queryKey: ['suggestions'],
    queryFn: () => base44.entities.Suggestion.list('-created_date'),
    initialData: [],
  });
}

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-created_date'),
    initialData: [],
  });
}