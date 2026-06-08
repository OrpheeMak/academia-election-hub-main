import { createContext, useContext, useState, ReactNode } from "react";

interface FiltersState {
  provinceId: string | null;
  setProvinceId: (id: string | null) => void;
}

const FiltersContext = createContext<FiltersState | undefined>(undefined);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [provinceId, setProvinceId] = useState<string | null>(null);
  return (
    <FiltersContext.Provider value={{ provinceId, setProvinceId }}>
      {children}
    </FiltersContext.Provider>
  );
};

export const useFilters = () => {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
};