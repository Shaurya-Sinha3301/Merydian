import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { phase4Service } from '../services/phase4';

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: phase4Service.settings });
}

export function useSettingsActions() {
  const qc = useQueryClient();
  return {
    save: useMutation({ mutationFn: phase4Service.saveSettings, onSuccess: (d) => qc.setQueryData(['settings'], d) }),
    test: useMutation({
      mutationFn: phase4Service.testMessage,
      onSuccess: () => window.setTimeout(() => qc.invalidateQueries({ queryKey: ['messages'] }), 1500),
    }),
  };
}

export function useMessages() {
  return useQuery({ queryKey: ['messages'], queryFn: phase4Service.messages, refetchInterval: 20000 });
}

export function useApiKeys() {
  return useQuery({ queryKey: ['api-keys'], queryFn: phase4Service.keys });
}

export function useApiKeyActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['api-keys'] });
  return {
    create: useMutation({ mutationFn: phase4Service.createKey, onSuccess: refresh }),
    revoke: useMutation({ mutationFn: phase4Service.revokeKey, onSuccess: refresh }),
  };
}

export function useExpenses(tripId: string) {
  return useQuery({ queryKey: ['expenses', tripId], queryFn: () => phase4Service.expenses(tripId), enabled: !!tripId });
}

export function useChecklist(tripId: string) {
  return useQuery({ queryKey: ['checklist', tripId], queryFn: () => phase4Service.checklist(tripId), enabled: !!tripId });
}

export function useGroupMoneyActions(tripId: string) {
  const qc = useQueryClient();
  const money = () => qc.invalidateQueries({ queryKey: ['expenses', tripId] });
  const list = () => qc.invalidateQueries({ queryKey: ['checklist', tripId] });
  return {
    addExpense: useMutation({ mutationFn: (b: { title: string; amount: number; paid_by?: string }) => phase4Service.addExpense(tripId, b), onSuccess: money }),
    deleteExpense: useMutation({ mutationFn: (id: string) => phase4Service.deleteExpense(tripId, id), onSuccess: money }),
    addItem: useMutation({ mutationFn: (text: string) => phase4Service.addItem(tripId, text), onSuccess: list }),
    tick: useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => phase4Service.tick(tripId, id, done), onSuccess: list }),
    removeItem: useMutation({ mutationFn: (id: string) => phase4Service.removeItem(tripId, id), onSuccess: list }),
  };
}
