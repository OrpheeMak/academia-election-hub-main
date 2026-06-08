import { useQuery } from "@tanstack/react-query";
import { electionApi } from "@/services/electionApi";
import { useFilters } from "@/contexts/FiltersContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";

const PALETTE = ["#1e3a8a", "#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd"];

const ResultsChart = () => {
  const { provinceId } = useFilters();
  const { data = [], isLoading } = useQuery({
    queryKey: ["resultats", provinceId],
    queryFn: () => electionApi.resultatsByCandidat(provinceId),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="bg-card rounded-lg shadow-md border border-border h-full">
      <div className="p-4 bg-electoral-light/40 border-b border-border">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Résultats par candidat</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Pourcentage des voix exprimées {provinceId ? "(province sélectionnée)" : "(national)"}
        </p>
      </div>
      <div className="p-3 sm:p-6 h-[360px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-electoral-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nom" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
                formatter={(v: number) => [`${v}%`, "Score"]}
              />
              <Legend />
              <Bar dataKey="pourcentage" name="% voix" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ResultsChart;