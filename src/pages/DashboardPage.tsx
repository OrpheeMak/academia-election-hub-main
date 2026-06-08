// src/pages/DashboardPage.tsx
// Page principale : agrège tous les composants premium
// Intègre Realtime, store, et design system

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, AlertCircle, MapPin, Users } from 'lucide-react';
import { useElectionStore, useFilteredResultats, useTopCandidates } from '@/store/electionStore';
import { useRealtimeResults, loadHistoricalData } from '@/hooks/useRealtimeResults';
import { GlassCard } from '@/components/premium/GlassCard';
import { KPIStat } from '@/components/premium/KPIStat';
import { AnomalyList } from '@/components/premium/AnomalyAlert';
import {
  ParticipationChart,
  VoteDistributionChart,
  VotesByCirconscriptionChart,
} from '@/components/premium/ElectionChart';
import { Button } from '@/components/ui/button';

export function DashboardPage() {
  const {
    election,
    circonscriptions,
    resultats,
    anomalies,
    isConnected,
    isLoading,
    darkMode,
    totalVoix,
    participationMoyenne,
    anomaliesCritiques,
    toggleDarkMode,
    setLoading,
  } = useElectionStore();

  // Hook Realtime
  useRealtimeResults();

  // État local pour anomalies filtrées
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const visibleAnomalies = anomalies
    .filter((a) => !dismissedAnomalies.has(a.id))
    .sort((a, b) => new Date(b.timestamp_detection).getTime() - new Date(a.timestamp_detection).getTime())
    .slice(0, 10);

  // Chargement données historiques au montage
  useEffect(() => {
    setLoading(true);
    loadHistoricalData()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error('Erreur chargement:', err);
        setLoading(false);
      });
  }, [setLoading]);

  // Filtrage
  const filteredResultats = useFilteredResultats();
  const topCandidates = useTopCandidates();

  // Indicateur connexion
  const connectionStatus = isConnected ? '🟢 EN DIRECT' : '🔴 HORS LIGNE';

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black dark:from-gray-900 dark:to-black transition-colors">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/10 bg-black/30">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-2xl font-bold text-white">
                🗳️ Tableau de Bord Électoral RDC
              </h1>
              <p className="text-xs text-gray-400 mt-1">Prototype académique - Simulation temps réel</p>
            </motion.div>

            {/* Status Badge */}
            <motion.div
              animate={{ scale: isConnected ? 1.05 : 1 }}
              className="flex items-center gap-3"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{connectionStatus}</p>
                <p className="text-xs text-gray-400">
                  {resultats.length} résultats | {anomaliesCritiques} anomalies
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-lg"
              >
                {darkMode ? '☀️' : '🌙'}
              </Button>
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Loading State */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-400">Chargement données électorales...</p>
            </motion.div>
          )}

          {!isLoading && election && (
            <>
              {/* Section 1 : KPIs Principaux */}
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="mb-8"
              >
                <h2 className="text-xl font-bold text-white mb-4">📊 Statistiques Clés</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPIStat
                    label="Total Voix"
                    value={totalVoix.toLocaleString('fr-FR')}
                    Icon={Users}
                    color="primary"
                    delay={0}
                  />

                  <KPIStat
                    label="Participation Moy."
                    value={participationMoyenne.toFixed(1)}
                    unit="%"
                    Icon={BarChart3}
                    color="success"
                    delay={0.1}
                  />

                  <KPIStat
                    label="Anomalies Critiques"
                    value={anomaliesCritiques}
                    Icon={AlertCircle}
                    color={anomaliesCritiques > 0 ? 'danger' : 'primary'}
                    delay={0.2}
                  />

                  <KPIStat
                    label="Circonscriptions"
                    value={circonscriptions.length}
                    Icon={MapPin}
                    color="warning"
                    delay={0.3}
                  />
                </div>
              </motion.section>

              {/* Section 2 : Alertes Anomalies */}
              {visibleAnomalies.length > 0 && (
                <motion.section
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  <h2 className="text-xl font-bold text-white mb-4">⚠️ Anomalies Détectées</h2>
                  <GlassCard className="p-4">
                    <AnomalyList
                      anomalies={visibleAnomalies.map((a) => ({
                        id: a.id,
                        type: a.type_anomalie,
                        description: a.description,
                        gravite: a.gravite,
                        timestamp: a.timestamp_detection,
                        zScore: a.z_score || undefined,
                      }))}
                      onDismiss={(id) => {
                        setDismissedAnomalies((prev) => new Set([...prev, id]));
                      }}
                      maxHeight="max-h-80"
                    />
                  </GlassCard>
                </motion.section>
              )}

              {/* Section 3 : Visualisations */}
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <h2 className="text-xl font-bold text-white mb-4">📈 Visualisations en Temps Réel</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ParticipationChart data={filteredResultats} />
                  <VoteDistributionChart
                    data={filteredResultats}
                    candidats={[
                      { id: 'cand-001', nom: 'Candidat Alpha', colour: '#e74c3c' },
                      { id: 'cand-002', nom: 'Candidat Beta', colour: '#3498db' },
                      { id: 'cand-003', nom: 'Candidat Gamma', colour: '#2ecc71' },
                      { id: 'cand-004', nom: 'Candidat Delta', colour: '#f39c12' },
                    ]}
                  />
                </div>

                <div className="mt-6">
                  <VotesByCirconscriptionChart
                    data={filteredResultats}
                    circonscriptions={circonscriptions}
                  />
                </div>
              </motion.section>

              {/* Section 4 : Top Candidats */}
              {topCandidates.length > 0 && (
                <motion.section
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-xl font-bold text-white mb-4">🏆 Top 3 Candidats</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topCandidates.map((candidate, index) => (
                      <motion.div
                        key={candidate.candidatId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                      >
                        <GlassCard gradient hover>
                          <div className="text-center">
                            <div className="text-4xl mb-2">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </div>
                            <p className="text-sm text-gray-400 mb-2">Candidat {index + 1}</p>
                            <p className="text-2xl font-bold text-white mb-1">
                              {candidate.voix.toLocaleString('fr-FR')}
                            </p>
                            <p className="text-xs text-gray-500">voix</p>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Footer Info */}
              <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-16 py-8 border-t border-white/10 text-center text-xs text-gray-500"
              >
                <p>
                  ⚖️ <strong>Prototype Académique</strong> – Ne remplace pas les résultats officiels de la CENI
                </p>
                <p className="mt-2">
                  Données simulées pour démonstration | Détection anomalies : Z-Score/IQR | Neutralité garantie
                </p>
              </motion.footer>
            </>
          )}

          {!isLoading && !election && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-4xl mb-4">❌</div>
              <p className="text-gray-400 mb-4">Aucune élection trouvée en base de données</p>
              <p className="text-sm text-gray-500">Lancez le script de simulation : npm run simulate</p>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
