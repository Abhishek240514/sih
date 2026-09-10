import { createContext, useContext, useState, ReactNode } from 'react';

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

  const setDataset = (id: string) => {
    setDatasetId(id);
    localStorage.setItem('selectedDatasetId', id);
  };

  return (
    <DatasetContext.Provider
      value={{
        datasetId,
        activeDatasetId: datasetId,
        datasets: [],
        setDatasetId: setDataset,
        setActiveDatasetId: setDataset,
        refreshDatasets: () => {},
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