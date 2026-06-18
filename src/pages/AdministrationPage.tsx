import { Database, Plus, Save, Settings, UserCog } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { provinceResults } from '@/lib/simulation-data';

export function AdministrationPage() {
  return (
    <AppShell
      title="Page administrateur"
      subtitle="Gestion simulee des elections, des profils et des parametres de lancement."
      eyebrow="Console d'administration"
    >
      <Tabs defaultValue="election">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="election">Election</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="settings">Parametres</TabsTrigger>
        </TabsList>

        <TabsContent value="election" className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nouvelle election
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="election-name">Nom</Label>
                <Input id="election-name" defaultValue="Election academique 2026" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="election-type">Type</Label>
                <select id="election-type" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option>Presidentielle</option>
                  <option>Legislative</option>
                  <option>Locale</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="election-date">Date</Label>
                <Input id="election-date" type="date" defaultValue="2026-07-15" />
              </div>
              <Button className="w-full gap-2">
                <Save className="h-4 w-4" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Couverture territoriale
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {provinceResults.map((province) => (
                <div key={province.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{province.name}</h2>
                    <Badge variant="outline">{province.totalOffices} bureaux</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {province.registered.toLocaleString('fr-FR')} electeurs inscrits
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Roles et acces
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {[
                ['Administrateur', 'Acces complet', '3 comptes'],
                ['Observateur', 'Lecture seule', '18 comptes'],
                ['Analyste', 'Anomalies et rapports', '5 comptes'],
              ].map(([role, permission, count]) => (
                <div key={role} className="rounded-md border border-slate-200 p-4">
                  <h2 className="font-semibold">{role}</h2>
                  <p className="mt-1 text-sm text-slate-600">{permission}</p>
                  <Badge className="mt-3" variant="outline">
                    {count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Parametres de simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="interval">Intervalle de mise a jour</Label>
                <Input id="interval" defaultValue="2000 ms" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate">Taux d'anomalies injectees</Label>
                <Input id="rate" defaultValue="5%" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="min-turnout">Participation minimum</Label>
                <Input id="min-turnout" defaultValue="30%" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max-turnout">Participation maximum</Label>
                <Input id="max-turnout" defaultValue="90%" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
