// components/Dashboard/FilterBarAdvanced.tsx
// Composant pour les filtres avancés et interactifs

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X, RotateCcw } from 'lucide-react';

interface FilterBarAdvancedProps {
  provinces?: { id: string; nom: string; code: string }[];
  onFilterChange?: (filters: FilterState) => void;
  onReset?: () => void;
}

interface FilterState {
  province?: string;
  election?: string;
  level?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const FilterBarAdvanced: React.FC<FilterBarAdvancedProps> = ({
  provinces = [],
  onFilterChange,
  onReset,
}) => {
  const [filters, setFilters] = useState<FilterState>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onReset?.();
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Barre de filtres compacts */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-electoral-primary" />
            <span className="font-semibold text-foreground">Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="bg-electoral-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Filtre Province */}
            <Select
              value={filters.province || ''}
              onValueChange={(value) =>
                handleFilterChange('province', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les provinces</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.code}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtre Type d'élection */}
            <Select
              value={filters.election || 'presidentielle'}
              onValueChange={(value) => handleFilterChange('election', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type d'élection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presidentielle">Présidentielle</SelectItem>
                <SelectItem value="legislative">Législative</SelectItem>
                <SelectItem value="locale">Locale</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtre Niveau géographique */}
            <Select
              value={filters.level || 'national'}
              onValueChange={(value) => handleFilterChange('level', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">Niveau national</SelectItem>
                <SelectItem value="provincial">Niveau provincial</SelectItem>
                <SelectItem value="municipal">Niveau municipal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              disabled={activeFiltersCount === 0}
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Réinitialiser</span>
            </Button>

            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="sm"
              title={isExpanded ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés'}
            >
              {isExpanded ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
              <span className="hidden sm:inline ml-2">
                {isExpanded ? 'Masquer' : 'Plus'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filtres avancés (si déployé) */}
      {isExpanded && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <h4 className="font-semibold text-foreground">Filtres avancés</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date de début
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date de fin
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              />
            </div>
          </div>

          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full"
          >
            Réinitialiser tous les filtres
          </Button>
        </div>
      )}
    </div>
  );
};
