import { createContext, useContext, useState, ReactNode } from 'react';

interface DatasetContextType {
  datasetId: string | null;
  setDatasetId: (id: string) => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasetId, setDatasetId] = useState<string | null>(
    () => localStorage.getItem('selectedDatasetId')
  );

  const setDataset = (id: string) => {
    setDatasetId(id);
    localStorage.setItem('selectedDatasetId', id);
  };

  return (
    <DatasetContext.Provider value={{ datasetId, setDatasetId: setDataset }}>
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