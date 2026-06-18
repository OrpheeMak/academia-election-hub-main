import { useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, TimerReset } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { candidateResults, getElectionSummary, provinceResults } from '@/lib/simulation-data';

export const SimulationPage = () => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(42);
  const [scenario, setScenario] = useState('normal');

  const summary = getElectionSummary();
  const adjustedResults = useMemo(() => {
    const modifier = scenario === 'anomalies' ? 1.08 : scenario === 'faible' ? 0.92 : 1;
    return candidateResults.map((candidate, index) => ({
      ...candidate,
      votes: Math.round(candidate.votes * modifier + index * progress * 430),
    }));
  }, [progress, scenario]);

  const launchSimulation = () => {
    setRunning(true);
    setProgress((value) => Math.min(100, value + 12));
  };

  const resetSimulation = () => {
    setRunning(false);
    setProgress(42);
    setScenario('normal');
  };

  return (
    <AppShell
      title="Page principale de simulation"
      subtitle="Lancez une simulation electorale, choisissez un scenario et observez la progression des resultats."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Controle de simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="scenario">
                Scenario
              </label>
              <select
                id="scenario"
                value={scenario}
                onChange={(event) => setScenario(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="normal">Flux normal</option>
                <option value="faible">Participation faible</option>
                <option value="anomalies">Injection d anomalies</option>
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Progression</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={launchSimulation} className="gap-2">
                <Play className="h-4 w-4" />
                Lancer
              </Button>
              <Button variant="outline" onClick={() => setRunning(false)} className="gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
              <Button variant="outline" onClick={resetSimulation} className="col-span-2 gap-2">
                <RotateCcw className="h-4 w-4" />
                Reinitialiser
              </Button>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TimerReset className="h-4 w-4 text-teal-700" />
                Etat
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {running ? 'Simulation active: les resultats evoluent.' : 'Simulation en attente.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-lg">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Inscrits</p>
                <p className="text-2xl font-bold">{summary.registered.toLocaleString('fr-FR')}</p>
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Bureaux</p>
                <p className="text-2xl font-bold">
                  {summary.countedOffices}/{summary.totalOffices}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Participation</p>
                <p className="text-2xl font-bold">{summary.averageTurnout.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Resultats generes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {adjustedResults.map((candidate) => {
                const maxVotes = Math.max(...adjustedResults.map((item) => item.votes));
                return (
                  <div key={candidate.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="font-semibold">{candidate.name}</span>
                        <span className="ml-2 text-slate-500">{candidate.party}</span>
                      </div>
                      <span className="font-semibold">{candidate.votes.toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(candidate.votes / maxVotes) * 100}%`,
                          backgroundColor: candidate.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Provinces suivies</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {provinceResults.map((province) => (
                <div key={province.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">{province.name}</h2>
                    <Badge variant={province.riskScore > 70 ? 'destructive' : 'outline'}>
                      {province.turnout}%
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{province.countedOffices} bureaux transmis</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};
