import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, RotateCcw } from "lucide-react";
import { electionApi } from "@/services/electionApi";
import { useFilters } from "@/contexts/FiltersContext";

interface FiltersBarProps {
  showAdvanced?: boolean;
}

const FiltersBar: React.FC<FiltersBarProps> = ({ showAdvanced = false }) => {
  const { provinceId, setProvinceId } = useFilters();
  const [isExpanded, setIsExpanded] = useState(false);
  const [election, setElection] = useState("presidentielle");
  const [level, setLevel] = useState("national");

  const { data: provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: electionApi.listProvinces,
    staleTime: 1000 * 60 * 30,
  });

  const activeFiltersCount = [
    provinceId && provinceId !== "all",
    election && election !== "presidentielle",
    level && level !== "national",
  ].filter(Boolean).length;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-500">
      {/* Barre de filtres principales */}
      <div className="bg-card rounded-lg border border-border p-3 sm:p-4 hover:border-electoral-primary/50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="w-4 h-4 text-electoral-primary" />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="ml-2 bg-electoral-primary text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Province */}
            <Select
              value={provinceId ?? "all"}
              onValueChange={(v) => setProvinceId(v === "all" ? null : v)}
            >
              <SelectTrigger className="hover:border-electoral-primary/50 transition-colors">
                <SelectValue placeholder="Province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les provinces</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Election Type */}
            <Select value={election} onValueChange={setElection} disabled={!showAdvanced}>
              <SelectTrigger className={!showAdvanced ? "opacity-50" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presidentielle">Présidentielle</SelectItem>
                <SelectItem value="legislative">Législative</SelectItem>
                <SelectItem value="locale">Locale</SelectItem>
              </SelectContent>
            </Select>

            {/* Level */}
            <Select value={level} onValueChange={setLevel} disabled={!showAdvanced}>
              <SelectTrigger className={!showAdvanced ? "opacity-50" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national">National</SelectItem>
                <SelectItem value="provincial">Provincial</SelectItem>
                <SelectItem value="municipal">Municipal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setProvinceId(null);
                setElection("presidentielle");
                setLevel("national");
              }}
              variant="outline"
              size="sm"
              disabled={activeFiltersCount === 0}
              className="transition-all hover:bg-red-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Réinitialiser</span>
            </Button>

            {showAdvanced && (
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="outline"
                size="sm"
              >
                {isExpanded ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                <span className="hidden sm:inline ml-2">
                  {isExpanded ? "Masquer" : "Plus"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filtres avancés */}
      {showAdvanced && isExpanded && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <h4 className="font-semibold text-foreground">Filtres avancés</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Date début
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-electoral-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Date fin
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-electoral-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersBar;