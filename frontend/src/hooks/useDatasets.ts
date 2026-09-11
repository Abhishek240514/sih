import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.getDatasets(),
  });
}

export function useUploadDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) => api.uploadDataset(file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}

export function useProcessDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => api.processDataset(datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => api.deleteDataset(datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}
