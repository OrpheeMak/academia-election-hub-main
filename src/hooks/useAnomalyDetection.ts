// src/hooks/useAnomalyDetection.ts
// Hook pour calculer anomalies côté client (redondance avec Supabase)
// Permet déclenchement d'alertes instantanées

import { useEffect, useRef } from 'react';
import { useElectionStore } from '@/store/electionStore';

interface AnomalyCheckParams {
  participation: number;
  voix: number;
  inscrits: number;
  precedentVoix?: number;
  participationHistorique?: number[];
}

/**
 * Calcule Z-Score côté client
 */
function calculateZScore(value: number, values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calcule IQR côté client
 */
function calculateIQR(value: number, values: number[]): { isOutlier: boolean; bounds: [number, number] } {
  if (values.length < 4) return { isOutlier: false, bounds: [0, 100] };

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length / 4)];
  const q3 = sorted[Math.floor((3 * sorted.length) / 4)];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return {
    isOutlier: value < lowerBound || value > upperBound,
    bounds: [lowerBound, upperBound],
  };
}

/**
 * Hook principal : utilise l'historique du store pour détecter anomalies
 */
export function useAnomalyDetection() {
  const { resultats } = useElectionStore();
  const detectedCache = useRef<Set<string>>(new Set());

  const detectClientSideAnomalies = (params: AnomalyCheckParams) => {
    const anomalies: Array<{
      type: string;
      severity: 'faible' | 'moyen' | 'critique';
      value: number;
    }> = [];

    // 1. Règle métier : participation > 100%
    if (params.participation > 100.5) {
      anomalies.push({
        type: 'participation_100_pourcent',
        severity: 'critique',
        value: params.participation,
      });
    }

    // 2. Règle métier : voix > inscrits
    if (params.voix > params.inscrits * 1.05) {
      anomalies.push({
        type: 'voix_depasse_inscrits',
        severity: 'critique',
        value: params.voix / params.inscrits,
      });
    }

    // 3. Règle métier : régression voix
    if (params.precedentVoix && params.voix < params.precedentVoix * 0.9) {
      anomalies.push({
        type: 'regression_voix',
        severity: 'moyen',
        value: params.voix / params.precedentVoix,
      });
    }

    // 4. Z-Score sur participation
    if (params.participationHistorique && params.participationHistorique.length >= 3) {
      const zScore = calculateZScore(params.participation, params.participationHistorique);
      if (Math.abs(zScore) > 2.5) {
        anomalies.push({
          type: 'zscore_participation',
          severity: Math.abs(zScore) > 3.5 ? 'critique' : 'moyen',
          value: zScore,
        });
      }
    }

    // 5. IQR sur participation
    if (params.participationHistorique && params.participationHistorique.length >= 4) {
      const { isOutlier } = calculateIQR(params.participation, params.participationHistorique);
      if (isOutlier) {
        anomalies.push({
          type: 'iqr_participation',
          severity: 'moyen',
          value: params.participation,
        });
      }
    }

    return anomalies;
  };

  return { detectClientSideAnomalies, detectedCache };
}

/**
 * Composable : Agrège participations par circonscription
 */
export function useParticipationByCirconscription(circonscriptionId?: string) {
  const { resultats } = useElectionStore();

  const filtered = circonscriptionId
    ? resultats.filter((r) => r.circonscription_id === circonscriptionId)
    : resultats;

  return filtered
    .map((r) => r.taux_participation)
    .sort((a, b) => a - b);
}

/**
 * Composable : Détecte tendances suspectes
 */
export function useSuspiciousTrends() {
  const { resultats } = useElectionStore();

  const trends = resultats
    .filter((r) => r.is_anomalie)
    .reduce((acc, r) => {
      const key = `${r.circonscription_id}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Retourne les circonscriptions avec le plus d'anomalies
  return Object.entries(trends)
    .map(([circo, count]) => ({ circonscription_id: circo, anomaly_count: count }))
    .sort((a, b) => b.anomaly_count - a.anomaly_count);
}
