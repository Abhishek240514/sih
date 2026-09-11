import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { MLTrainRequest } from '@/lib/types';

export function useMLStatus() {
  return useQuery({
    queryKey: ['ml', 'status'],
    queryFn: () => api.getMLStatus(),
  });
}

export function useModelFeatures() {
  return useQuery({
    queryKey: ['ml', 'features'],
    queryFn: () => api.getModelFeatures(),
  });
}

export function useListModels() {
  return useQuery({
    queryKey: ['ml', 'models'],
    queryFn: () => api.listModels(),
  });
}

export function useTrainModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: MLTrainRequest) => api.trainModel(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml'] });
    },
  });
}

export function usePredictAnomalies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => api.predictAnomalies(datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useLoadModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelId: string) => api.loadModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml', 'status'] });
    },
  });
}
