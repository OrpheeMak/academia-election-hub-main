// src/pages/AdministrationPage.tsx
// Page d'Administration : Gestion des élections, simulations et configurations

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Play, Pause, RotateCcw, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { backendOrchestrator, SimulationConfig } from '@/services/backendOrchestrator';
import { votingDataGenerator } from '@/services/votingDataGenerator';
import { communicationRulesEngine } from '@/services/communicationRules';

export function AdministrationPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [selectedElection, setSelectedElection] = useState<string | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [communicationStats, setCommunicationStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'législative',
    date_election: '',
  });

  useEffect(() => {
    loadElections();
    const statsInterval = setInterval(() => {
      setCommunicationStats(communicationRulesEngine.getStats());
    }, 5000);

    return () => clearInterval(statsInterval);
  }, []);

  const loadElections = async () => {
    try {
      const res = await backendOrchestrator.getAllElections();
      if (res.success) {
        setElections(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedElection(res.data[0].id);
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const createElection = async () => {
    try {
      const res = await backendOrchestrator.createElection({
        nom: formData.nom,
        type: formData.type as any,
        date_election: formData.date_election,
        date_creation: new Date().toISOString(),
        statut: 'prévue',
        description: '',
      } as any);

      if (res.success) {
        setFormData({ nom: '', type: 'législative', date_election: '' });
        loadElections();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const startSimulation = async () => {
    if (!selectedElection) return;

    try {
      setSimulationRunning(true);
      communicationRulesEngine.connect();

      const config: SimulationConfig = {
        election_id: selectedElection,
        duration_seconds: 3600,
        batch_interval_ms: 2000,
        anomaly_injection_rate: 0.05,
        participation_range: { min: 0.3, max: 0.9 },
      };

      const res = await backendOrchestrator.startSimulation(config);

      if (res.success) {
        // Simuler l'injection de données
        simulateVotingFlow(config);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSimulationRunning(false);
    }
  };

  const simulateVotingFlow = async (config: SimulationConfig) => {
    // Récupérer les provinces et candidats
    const provincesRes = await backendOrchestrator.getProvincesByElection(config.election_id);
    const candidatesRes = await backendOrchestrator.getCandidatsByElection(config.election_id);

    if (!provincesRes.success || !candidatesRes.success) return;

    const provinceIds = provincesRes.data?.map((p) => p.id) || [];
    const candidateIds = candidatesRes.data?.map((c) => c.id) || [];

    let timeIndex = 0;

    const simulationInterval = setInterval(async () => {
      if (!simulationRunning || timeIndex >= config.duration_seconds) {
        clearInterval(simulationInterval);
        setSimulationRunning(false);
        return;
      }

      // Générer un lot de votes
      const batch = votingDataGenerator.generateVotingBatch(
        config,
        timeIndex,
        provinceIds,
        candidateIds
      );

      // Insérer les votes
      for (const vote of batch.votes) {
        await backendOrchestrator.insertResultat(vote);
        await communicationRulesEngine.emitEvent('result_received', vote, config.election_id);
      }

      // Traiter les anomalies
      for (const anomaly of batch.anomalies) {
        await communicationRulesEngine.emitEvent('anomaly_detected', anomaly, config.election_id);
      }

      timeIndex += config.batch_interval_ms / 1000;
    }, config.batch_interval_ms);
  };

  const stopSimulation = () => {
    setSimulationRunning(false);
    communicationRulesEngine.disconnect();
    votingDataGenerator.reset();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-8">⚙️ Administration</h1>

          <Tabs defaultValue="elections" className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="elections">Élections</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>

            {/* ÉLECTIONS TAB */}
            <TabsContent value="elections">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulaire de création */}
                <Card>
                  <CardHeader>
                    <CardTitle>Nouvelle Élection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        placeholder="Élection présidentielle 2026"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="présidentielle">Présidentielle</option>
                        <option value="législative">Législative</option>
                        <option value="locale">Locale</option>
                        <option value="référendum">Référendum</option>
                      </select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date_election}
                        onChange={(e) =>
                          setFormData({ ...formData, date_election: e.target.value })
                        }
                      />
                    </div>
                    <Button onClick={createElection} className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      Créer Élection
                    </Button>
                  </CardContent>
                </Card>

                {/* Liste des élections */}
                <Card>
                  <CardHeader>
                    <CardTitle>Élections Existantes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {elections.map((election) => (
                        <motion.div
                          key={election.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`p-3 border rounded cursor-pointer transition ${
                            selectedElection === election.id
                              ? 'bg-blue-50 border-blue-300'
                              : 'hover:bg-slate-100'
                          }`}
                          onClick={() => setSelectedElection(election.id)}
                        >
                          <div className="font-semibold">{election.nom}</div>
                          <div className="text-sm text-slate-600">
                            {new Date(election.date_election).toLocaleDateString('fr-FR')} •{' '}
                            <span className="capitalize">{election.statut}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SIMULATION TAB */}
            <TabsContent value="simulation">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion de Simulation</CardTitle>
                  <CardDescription>
                    Générer et gérer les flux de votes fictifs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Status */}
                    <div className="p-4 bg-slate-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">État de la Simulation</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {simulationRunning ? '🟢 En cours' : '⚫ Arrêtée'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!simulationRunning ? (
                            <Button onClick={startSimulation} className="gap-2">
                              <Play className="w-4 h-4" />
                              Démarrer
                            </Button>
                          ) : (
                            <Button onClick={stopSimulation} variant="destructive" className="gap-2">
                              <Pause className="w-4 h-4" />
                              Arrêter
                            </Button>
                          )}
                          <Button onClick={() => votingDataGenerator.reset()} variant="outline">
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Configuration */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Taux d'anomalies injectées</Label>
                        <Input type="number" placeholder="0.05" min="0" max="1" step="0.01" />
                      </div>
                      <div>
                        <Label>Intervalle de mise à jour (ms)</Label>
                        <Input type="number" placeholder="2000" min="500" max="10000" />
                      </div>
                      <div>
                        <Label>Participation min (%)</Label>
                        <Input type="number" placeholder="30" min="0" max="100" />
                      </div>
                      <div>
                        <Label>Participation max (%)</Label>
                        <Input type="number" placeholder="90" min="0" max="100" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900">ℹ️ Fonctionnement</h4>
                      <ul className="text-sm text-blue-800 mt-2 space-y-1">
                        <li>✓ Génère des votes fictifs réalistes</li>
                        <li>✓ Simule les patterns électoraux RDC</li>
                        <li>✓ Injecte automatiquement les anomalies</li>
                        <li>✓ Envoie en temps-réel via WebSocket</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* COMMUNICATION TAB */}
            <TabsContent value="communication">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques de Communication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-100 rounded">
                        <div className="text-sm text-slate-600">Événements Total</div>
                        <div className="text-3xl font-bold">
                          {communicationStats?.totalEvents || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-blue-100 rounded">
                        <div className="text-sm text-blue-700">Événements en Attente</div>
                        <div className="text-3xl font-bold text-blue-900">
                          {communicationStats?.pendingEvents || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded">
                        <div className="text-sm text-yellow-700">Queue Size</div>
                        <div className="text-3xl font-bold text-yellow-900">
                          {communicationStats?.queueSize || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-red-100 rounded">
                        <div className="text-sm text-red-700">Événements Échoués</div>
                        <div className="text-3xl font-bold text-red-900">
                          {communicationStats?.failedEvents || 0}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Règles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Règles de Communication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="p-2 border-l-4 border-red-500 bg-red-50">
                        <span className="font-semibold">Anomalies</span>: Immédiat (CRITIQUE)
                      </div>
                      <div className="p-2 border-l-4 border-orange-500 bg-orange-50">
                        <span className="font-semibold">Résultats Anormaux</span>: Par lot (HAUTE)
                      </div>
                      <div className="p-2 border-l-4 border-blue-500 bg-blue-50">
                        <span className="font-semibold">Participation</span>: Throttle 5s (HAUTE)
                      </div>
                      <div className="p-2 border-l-4 border-green-500 bg-green-50">
                        <span className="font-semibold">Synchronisation</span>: 30s (MOYENNE)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
