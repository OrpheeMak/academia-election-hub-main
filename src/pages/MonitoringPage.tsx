// src/pages/MonitoringPage.tsx
// Page de Monitoring : Surveillance en temps réel du système

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Zap, Database, Radio, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseOrchestrator } from '@/services/supabaseOrchestrator';
import { communicationRulesEngine } from '@/services/communicationRules';

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'offline';
  api: 'healthy' | 'degraded' | 'offline';
  realtime: 'connected' | 'disconnected' | 'reconnecting';
  lastCheck: Date;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  queriesPerSecond: number;
  eventsPerSecond: number;
  errorRate: number;
}

export function MonitoringPage() {
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    api: 'healthy',
    realtime: 'connected',
    lastCheck: new Date(),
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgResponseTime: 45,
    queriesPerSecond: 125,
    eventsPerSecond: 320,
    errorRate: 0.2,
  });

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }>>([]);

  const [election, setElection] = useState<any>(null);
  const [uptime, setUptime] = useState('99.8%');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Récupérer l'élection en cours
      const electionRes = await supabaseOrchestrator.getCurrentElection();
      if (electionRes.success) {
        setElection(electionRes.data);
      }

      // Simuler les vérifications de santé
      updateHealth();
      updateMetrics();
    } catch (error) {
      console.error('Erreur:', error);
      addAlert('critical', 'Erreur lors de la récupération des données');
    }
  };

  const updateHealth = () => {
    const randomHealth = () => {
      const rand = Math.random();
      if (rand < 0.85) return 'healthy';
      if (rand < 0.95) return 'degraded';
      return 'offline';
    };

    setHealth({
      database: randomHealth() as any,
      api: randomHealth() as any,
      realtime: Math.random() > 0.05 ? 'connected' : 'disconnecting',
      lastCheck: new Date(),
    });
  };

  const updateMetrics = () => {
    setMetrics({
      avgResponseTime: Math.floor(40 + Math.random() * 30),
      queriesPerSecond: Math.floor(100 + Math.random() * 150),
      eventsPerSecond: Math.floor(250 + Math.random() * 200),
      errorRate: Math.random() * 0.5,
    });
  };

  const addAlert = (level: 'info' | 'warning' | 'critical', message: string) => {
    const newAlert = {
      id: `${Date.now()}`,
      level,
      message,
      timestamp: new Date(),
    };
    setAlerts((prev) => [newAlert, ...prev].slice(0, 10));
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'degraded':
      case 'reconnecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'offline':
      case 'disconnected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-8">📡 Monitoring Système</h1>

          {/* Santé du système */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Base de Données
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getHealthColor(health.database)}`}>
                  {health.database === 'healthy' ? '✓ Sain' : health.database === 'degraded' ? '⚠️ Dégradé' : '✗ Hors ligne'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getHealthColor(health.api)}`}>
                  {health.api === 'healthy' ? '✓ Sain' : health.api === 'degraded' ? '⚠️ Dégradé' : '✗ Hors ligne'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  Temps Réel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getHealthColor(health.realtime)}`}>
                  {health.realtime === 'connected' ? '✓ Connecté' : health.realtime === 'reconnecting' ? '🔄 Reconnexion' : '✗ Déconnecté'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Disponibilité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{uptime}</div>
              </CardContent>
            </Card>
          </div>

          {/* Performances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Métriques de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Temps Réponse Moyen</span>
                    <span className="text-lg font-bold">{metrics.avgResponseTime}ms</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((metrics.avgResponseTime / 100) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Requêtes par Seconde</span>
                    <span className="text-lg font-bold">{metrics.queriesPerSecond}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((metrics.queriesPerSecond / 500) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Événements par Seconde</span>
                    <span className="text-lg font-bold">{metrics.eventsPerSecond}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((metrics.eventsPerSecond / 1000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Taux d'Erreur</span>
                    <span className={`text-lg font-bold ${metrics.errorRate > 0.3 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.errorRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${metrics.errorRate > 0.3 ? 'bg-red-600' : 'bg-green-600'}`}
                      style={{ width: `${metrics.errorRate * 10}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Communication Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const stats = communicationRulesEngine.getStats();
                    return (
                      <>
                        <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                          <div className="text-sm text-blue-700">Événements Total</div>
                          <div className="text-2xl font-bold text-blue-900">{stats.totalEvents}</div>
                        </div>
                        <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                          <div className="text-sm text-green-700">Événements Livrés</div>
                          <div className="text-2xl font-bold text-green-900">
                            {stats.totalEvents - stats.pendingEvents}
                          </div>
                        </div>
                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                          <div className="text-sm text-yellow-700">Queue Active</div>
                          <div className="text-2xl font-bold text-yellow-900">{stats.queueSize}</div>
                        </div>
                        <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                          <div className="text-sm text-red-700">Échecs</div>
                          <div className="text-2xl font-bold text-red-900">{stats.failedEvents}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertes */}
          <Card>
            <CardHeader>
              <CardTitle>Alertes Système (10 dernières)</CardTitle>
              <CardDescription>Événements importants du système</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded flex items-start gap-3 ${
                        alert.level === 'critical'
                          ? 'bg-red-50 border-l-4 border-red-500'
                          : alert.level === 'warning'
                          ? 'bg-yellow-50 border-l-4 border-yellow-500'
                          : 'bg-blue-50 border-l-4 border-blue-500'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-sm">
                        <div className="font-semibold">{alert.message}</div>
                        <div className="text-xs opacity-70">
                          {alert.timestamp.toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Aucune alerte pour le moment ✓
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
