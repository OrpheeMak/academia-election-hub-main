import { BarChart3, CheckCircle2, Eye, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  candidateResults,
  getElectionSummary,
  provinceResults,
  simulatedAnomalies,
} from '@/lib/simulation-data';

export function ObserverPage() {
  const summary = getElectionSummary();
  const winner = [...candidateResults].sort((a, b) => b.votes - a.votes)[0];

  return (
    <AppShell
      title="Page observateur"
      subtitle="Visualisation en lecture seule des resultats simules, de la progression et des signaux de risque."
      eyebrow="Vue publique controlee"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Voix consolidees</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalVotes.toLocaleString('fr-FR')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Participation moyenne</p>
            <p className="mt-2 text-3xl font-bold">{summary.averageTurnout.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Bureaux depouilles</p>
            <p className="mt-2 text-3xl font-bold">{summary.progress}%</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Alertes actives</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{simulatedAnomalies.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resultats par candidat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={candidateResults}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => value.toLocaleString('fr-FR')} />
                  <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                    {candidateResults.map((candidate) => (
                      <Cell key={candidate.id} fill={candidate.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Etat general
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-slate-500">Candidat en tete</p>
              <p className="mt-1 text-xl font-bold">{winner.name}</p>
              <p className="text-sm text-slate-600">{winner.party}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Progression nationale</span>
                <span>{summary.countedOffices}/{summary.totalOffices}</span>
              </div>
              <Progress value={summary.progress} />
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              Les chiffres affiches sont simules et non officiels.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Detail par province
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {provinceResults.map((province) => (
            <div key={province.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{province.name}</h2>
                <Badge variant={province.riskScore > 70 ? 'destructive' : 'outline'}>
                  Risque {province.riskScore}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">En tete: {province.leadingCandidate}</p>
              <div className="mt-3">
                <Progress value={(province.countedOffices / province.totalOffices) * 100} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
