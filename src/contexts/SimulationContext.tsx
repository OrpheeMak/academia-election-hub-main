import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Simulation, ElectionResult } from '../services/simulationsService';

interface SimulationContextType {
  currentSimulation: Simulation | null;
  results: ElectionResult[];
  loading: boolean;
  setCurrentSimulation: (sim: Simulation | null) => void;
  setResults: (results: ElectionResult[]) => void;
  setLoading: (loading: boolean) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(null);
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <SimulationContext.Provider
      value={{
        currentSimulation,
        results,
        loading,
        setCurrentSimulation,
        setResults,
        setLoading,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return context;
};
