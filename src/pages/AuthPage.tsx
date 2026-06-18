import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AuthPage() {
  const [role, setRole] = useState('administrateur');
  const navigate = useNavigate();

  const handleLogin = () => {
    const destinationByRole: Record<string, string> = {
      administrateur: '/administration',
      observateur: '/observateur',
      analyste: '/anomalies',
    };

    localStorage.setItem('academia-election-role', role);
    navigate(destinationByRole[role] || '/simulation');
  };

  return (
    <AppShell
      title="Authentification"
      subtitle="Acces simule pour les administrateurs, observateurs et analystes du prototype."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="rounded-lg border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Connexion securisee
              </CardTitle>
              <Badge variant="outline">Simulation</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Invitation</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="admin@academia-election.cd" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" placeholder="••••••••" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="administrateur">Administrateur</option>
                    <option value="observateur">Observateur</option>
                    <option value="analyste">Analyste anomalies</option>
                  </select>
                </div>
                <Button className="w-full gap-2" onClick={handleLogin}>
                  <LogIn className="h-4 w-4" />
                  Se connecter
                </Button>
              </TabsContent>

              <TabsContent value="register" className="mt-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="invite-name">Nom complet</Label>
                  <Input id="invite-name" placeholder="Nom de l utilisateur" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email institutionnel</Label>
                  <Input id="invite-email" type="email" placeholder="observateur@institution.org" />
                </div>
                <Button variant="outline" className="w-full gap-2">
                  <UserPlus className="h-4 w-4" />
                  Generer une invitation
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[
            ['Administrateur', 'Gestion des elections, utilisateurs et parametres de simulation.'],
            ['Observateur', 'Lecture seule des resultats consolides et de la progression.'],
            ['Analyste anomalies', 'Validation des alertes et suivi des recommandations.'],
          ].map(([title, description]) => (
            <Card key={title} className="rounded-lg border-slate-200">
              <CardContent className="flex gap-3 p-4">
                <Lock className="mt-1 h-5 w-5 text-slate-500" />
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="text-sm text-slate-600">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
