import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, MapPin, AlertTriangle } from "lucide-react";
import { electionApi } from "@/services/electionApi";
import { useFilters } from "@/contexts/FiltersContext";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: string;
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, tone, trend, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg shadow-sm border border-border p-4 transition-all duration-300 hover:shadow-lg hover:border-electoral-primary/50 hover:scale-105 cursor-pointer group animate-in fade-in zoom-in-95"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs sm:text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </p>
        <div className={`${tone} transition-transform group-hover:scale-110`}>{icon}</div>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
      {trend && (
        <p className={`text-sm font-medium mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </p>
      )}
    </div>
  );
};

const KpiCards = () => {
  const { provinceId } = useFilters();
  
  const { data: parts = [] } = useQuery({
    queryKey: ["v_participation_province"],
    queryFn: electionApi.participationByProvince,
    staleTime: 1000 * 60 * 5,
  });
  
  const { data: anomalies = [] } = useQuery({
    queryKey: ["anomalies", provinceId],
    queryFn: () => electionApi.anomalies(provinceId),
    staleTime: 1000 * 60 * 5,
  });

  const filtered = provinceId ? parts.filter((p) => p.province_id === provinceId) : parts;
  const totalVotants = filtered.reduce((a, b) => a + (b.votants_total ?? 0), 0);
  const totalInscrits = filtered.reduce((a, b) => a + (b.inscrits_total ?? 0), 0);
  const tauxNational = totalInscrits ? +((totalVotants * 100) / totalInscrits).toFixed(2) : 0;

  const kpis: KPICardProps[] = [
    {
      label: "Provinces couvertes",
      value: filtered.length,
      icon: <MapPin className="w-4 h-4" />,
      tone: "text-electoral-primary",
      trend: { value: 12, positive: true },
    },
    {
      label: "Inscrits total",
      value: totalInscrits.toLocaleString("fr-FR"),
      icon: <Users className="w-4 h-4" />,
      tone: "text-electoral-secondary",
      trend: { value: 5, positive: true },
    },
    {
      label: "Participation",
      value: `${tauxNational}%`,
      icon: <TrendingUp className="w-4 h-4" />,
      tone: "text-electoral-dark",
      trend: { value: 8, positive: true },
    },
    {
      label: "Anomalies",
      value: anomalies.length,
      icon: <AlertTriangle className="w-4 h-4" />,
      tone: "text-warning",
      trend: { value: 3, positive: false },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi, idx) => (
        <div key={kpi.label} style={{ animationDelay: `${idx * 100}ms` }}>
          <KPICard {...kpi} />
        </div>
      ))}
    </div>
  );
};

export default KpiCards;