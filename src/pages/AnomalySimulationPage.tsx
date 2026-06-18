import { useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, RefreshCw, ShieldAlert } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { simulatedAnomalies } from '@/lib/simulation-data';

const severityStyle = {
  faible: 'border-blue-200 bg-blue-50 text-blue-800',
  moyenne: 'border-amber-200 bg-amber-50 text-amber-800',
  critique: 'border-red-200 bg-red-50 text-red-800',
};

export function AnomalySimulationPage() {
  const [sensitivity, setSensitivity] = useState([68]);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const visibleAnomalies = useMemo(() => {
    return simulatedAnomalies
      .map((anomaly, index) => ({
        ...anomaly,
        score: Math.min(100, Math.max(10, anomaly.score + ((refreshIndex + index) % 3) * 3)),
      }))
      .filter((anomaly) => anomaly.score >= sensitivity[0] - 35);
  }, [refreshIndex, sensitivity]);

  const criticalCount = visibleAnomalies.filter((anomaly) => anomaly.severity === 'critique').length;
  const averageScore =
    visibleAnomalies.reduce((sum, anomaly) => sum + anomaly.score, 0) /
    Math.max(visibleAnomalies.length, 1);

  return (
    <AppShell
      title="Detection d'anomalies"
      subtitle="Module de simulation pour tester les alertes, les scores de risque et les recommandations de controle."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-teal-700" />
                Parametres du detecteur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span>Sensibilite</span>
                  <span className="font-semibold">{sensitivity[0]}%</span>
                </div>
                <Slider value={sensitivity} onValueChange={setSensitivity} min={30} max={95} step={1} />
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setRefreshIndex((value) => value + 1)}
              >
                <RefreshCw className="h-4 w-4" />
                Relancer la detection
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardContent className="grid gap-4 p-5">
              <div>
                <p className="text-sm text-slate-500">Anomalies detectees</p>
                <p className="text-3xl font-bold">{visibleAnomalies.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Critiques</p>
                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Score moyen</p>
                <p className="text-3xl font-bold">{averageScore.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Alertes simulees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleAnomalies.map((anomaly) => (
              <div key={anomaly.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{anomaly.province}</h2>
                      <Badge className={severityStyle[anomaly.severity]} variant="outline">
                        {anomaly.severity}
                      </Badge>
                      <Badge variant="outline">{anomaly.type}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{anomaly.message}</p>
                    <p className="mt-1 text-sm text-slate-500">{anomaly.recommendation}</p>
                  </div>
                  <div className="min-w-36">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Score</span>
                      <span className="font-semibold">{anomaly.score}</span>
                    </div>
                    <Progress value={anomaly.score} />
                  </div>
                </div>
              </div>
            ))}

            {visibleAnomalies.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-slate-500">
                <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
                Aucune anomalie au seuil actuel.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
