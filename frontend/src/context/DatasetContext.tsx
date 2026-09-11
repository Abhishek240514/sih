import { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';

interface DatasetContextType {
  datasetId: string | null;
  activeDatasetId: string | null;
  datasets?: any[];
  setDatasetId: (id: string) => void;
  setActiveDatasetId?: (id: string) => void;
  refreshDatasets?: () => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasetId, setDatasetId] = useState<string | null>(
    () => localStorage.getItem('selectedDatasetId')
  );

  const { data: datasets, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.getDatasets(),
  });

  const setDataset = (id: string) => {
    setDatasetId(id);
    localStorage.setItem('selectedDatasetId', id);
  };

  return (
    <DatasetContext.Provider
      value={{
        datasetId,
        activeDatasetId: datasetId,
        datasets: datasets || [],
        setDatasetId: setDataset,
        setActiveDatasetId: setDataset,
        refreshDatasets: refetch,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}