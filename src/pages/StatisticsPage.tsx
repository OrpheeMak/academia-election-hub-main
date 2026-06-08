// src/pages/StatisticsPage.tsx
// Page de Statistiques : Analyse complète des données électorales

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { backendOrchestrator, ElectionStats, ProvinceStats } from '@/services/backendOrchestrator';
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function StatisticsPage() {
  const [election, setElection] = useState<any>(null);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [provinceStats, setProvinceStats] = useState<ProvinceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participationTrend, setParticipationTrend] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh all 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Récupérer l'élection en cours
      const electionRes = await backendOrchestrator.getCurrentElection();
      if (electionRes.success && electionRes.data) {
        setElection(electionRes.data);

        // Récupérer les stats globales
        const globalStatsRes = await backendOrchestrator.getGlobalStats(electionRes.data.id);
        if (globalStatsRes.success) {
          setStats(globalStatsRes.data || null);

          // Générer les données de tendance
          generateTrendData(globalStatsRes.data);
        }

        // Récupérer les stats par province
        const provincesRes = await backendOrchestrator.getProvincesByElection(electionRes.data.id);
        if (provincesRes.success && provincesRes.data) {
          const statsPromises = provincesRes.data.map((p) =>
            backendOrchestrator.getProvinceStats(p.id)
          );
          const results = await Promise.all(statsPromises);
          setProvinceStats(
            results.filter((r) => r.success && r.data).map((r) => r.data!)
          );
        }
      }

      setError(null);
    } catch (err) {
      setError(`Erreur lors du chargement: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateTrendData = (statsData: ElectionStats) => {
    // Générer des données de tendance fictives
    const data = [];
    for (let i = 0; i < 24; i++) {
      data.push({
        time: `${i}h`,
        participation: Math.max(20, Math.min(100, 30 + i * 2 + Math.random() * 10)),
        voix: Math.floor(statsData.totalVoix * (i / 24) + Math.random() * 1000),
      });
    }
    setParticipationTrend(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Zap className="w-12 h-12 animate-pulse mx-auto mb-4" />
          <p>Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-slate-50">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Erreur</CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">📊 Statistiques Électorales</h1>
            <p className="text-slate-600">
              {election?.nom} - {new Date(election?.date_election).toLocaleDateString('fr-FR')}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Voix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalVoix.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.participationMoyenne}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Anomalies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats?.anomaliesCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Bureaux Actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats?.bureaux_actifs}</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="trends" className="mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trends">Tendances</TabsTrigger>
              <TabsTrigger value="provinces">Provinces</TabsTrigger>
            </TabsList>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Tendances de Participation</CardTitle>
                  <CardDescription>Évolution de la participation et des voix au fil du temps</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={participationTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="participation"
                        stroke="#3b82f6"
                        name="Participation (%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="provinces">
              <Card>
                <CardHeader>
                  <CardTitle>Résultats par Province</CardTitle>
                  <CardDescription>Voix par province</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {provinceStats.map((province) => (
                      <motion.div
                        key={province.provinceId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">{province.provinceName}</h3>
                          <span className="text-sm text-slate-600">
                            {province.taux_participation}% participation
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${province.taux_participation}%` }}
                          ></div>
                        </div>
                        <div className="text-sm text-slate-600">
                          {province.voixTotal.toLocaleString()} voix
                          {province.anomaliesCount > 0 && (
                            <span className="ml-4 text-red-600 font-semibold">
                              ⚠️ {province.anomaliesCount} anomalie(s)
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Refresh Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={loadData}>
            Actualiser
          </Button>
          <Button>Exporter Rapport</Button>
        </div>
      </div>
    </div>
  );
}
