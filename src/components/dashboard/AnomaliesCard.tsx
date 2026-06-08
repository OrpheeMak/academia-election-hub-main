import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { electionApi } from "@/services/electionApi";
import { useFilters } from "@/contexts/FiltersContext";
import { detectZScore, detectIQR } from "@/lib/anomalies";
import { AlertTriangle, RefreshCw, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AnomaliesCard = () => {
  const { provinceId } = useFilters();

  const { data: stored = [], isLoading: l1, refetch: r1, isFetching: f1 } = useQuery({
    queryKey: ["anomalies", provinceId],
    queryFn: () => electionApi.anomalies(provinceId),
    staleTime: 1000 * 60 * 5,
  });

  const { data: samples = [], isLoading: l2, refetch: r2 } = useQuery({
    queryKey: ["bureau_samples", provinceId],
    queryFn: () => electionApi.bureauParticipationSample(provinceId),
    staleTime: 1000 * 60 * 5,
  });

  const live = useMemo(() => {
    const z = detectZScore(samples.map((s) => ({ bureau_id: s.bureau_id, taux: s.taux })));
    const i = detectIQR(samples.map((s) => ({ bureau_id: s.bureau_id, taux: s.taux })));
    const merged = new Map<string, typeof z[number]>();
    [...z, ...i].forEach((h) => {
      const existing = merged.get(h.bureau_id);
      if (!existing || Math.abs(h.score) > Math.abs(existing.score)) merged.set(h.bureau_id, h);
    });
    return Array.from(merged.values()).slice(0, 30);
  }, [samples]);

  const isLoading = l1 || l2;

  return (
    <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden h-full">
      <div className="p-4 bg-warning/10 border-b border-warning/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Détection d'anomalies</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            r1();
            r2();
          }}
          disabled={f1}
        >
          <RefreshCw className={`w-4 h-4 ${f1 ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="p-4 sm:p-6 space-y-4 max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-warning" />
          </div>
        ) : (
          <>
            {stored.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Anomalies enregistrées ({stored.length})
                </p>
                <div className="space-y-2">
                  {stored.slice(0, 10).map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg border border-warning/20 bg-warning/5 flex items-start justify-between gap-3"
                    >
                      <div className="text-sm">
                        <p className="font-semibold text-foreground">{a.province?.nom ?? "Province"}</p>
                        <p className="text-muted-foreground text-xs">{a.type}</p>
                      </div>
                      <Badge variant="destructive">{a.methode}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Détections statistiques temps réel ({live.length})
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px]">
                      Z-score |z|≥2,5 et règle IQR (1,5×) appliqués au taux de participation des bureaux.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {live.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune anomalie statistique détectée.</p>
              ) : (
                <div className="space-y-2">
                  {live.map((h) => (
                    <div
                      key={h.bureau_id + h.methode}
                      className="p-3 rounded-lg border border-warning/20 bg-warning/5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          Bureau {h.bureau_id.slice(0, 6)}…
                        </span>
                        <Badge variant="outline" className="text-warning border-warning">
                          {h.methode}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{h.raison}</p>
                      <p className="text-xs mt-1">Taux : <b>{h.taux}%</b></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnomaliesCard;