import { useQuery } from "@tanstack/react-query";
import { electionApi } from "@/services/electionApi";
import { useFilters } from "@/contexts/FiltersContext";
import { Brain, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const PredictionCard = () => {
  const { provinceId } = useFilters();
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["predictions", provinceId],
    queryFn: () => electionApi.predictions(provinceId),
    staleTime: 1000 * 60 * 5,
  });

  // Agréger côté client si pas de filtre province : moyenne par candidat
  const agg = (() => {
    const map = new Map<string, { nom: string; parti: string; scores: number[] }>();
    data.forEach((p) => {
      const key = p.candidat_id;
      const e = map.get(key) ?? { nom: p.candidat?.nom ?? "—", parti: p.candidat?.parti ?? "", scores: [] };
      e.scores.push(Number(p.score_predit));
      map.set(key, e);
    });
    return Array.from(map.values())
      .map((e) => ({
        nom: e.nom,
        parti: e.parti,
        score: +(e.scores.reduce((a, b) => a + b, 0) / e.scores.length).toFixed(2),
      }))
      .sort((a, b) => b.score - a.score);
  })();

  return (
    <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden h-full">
      <div className="p-4 bg-electoral-light/40 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-electoral-primary" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Prédictions</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-electoral-primary" />
          </div>
        ) : agg.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune prédiction disponible.</p>
        ) : (
          <div className="space-y-4">
            {agg.slice(0, 5).map((c, i) => (
              <div key={c.nom} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {i + 1}. {c.nom} <span className="text-muted-foreground">— {c.parti}</span>
                  </span>
                  <span className="font-bold text-electoral-primary">{c.score}%</span>
                </div>
                <Progress value={c.score} className="h-2" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              {provinceId ? "Prédiction provinciale" : "Moyenne nationale"} — données simulées
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionCard;