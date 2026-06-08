// hooks/useAnomalies.ts
// Hook consolidé pour la détection d'anomalies (serveur + client)

import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { supabase } from '@/config/supabase';
import { useElectionStore } from '@/store/electionStore';
import { Anomalie, AnomalieAvecDetails } from '@/types/database';

interface AnomalyCheckParams {
  participation: number;
  voix: number;
  inscrits: number;
  precedentVoix?: number;
  participationHistorique?: number[];
}

/**
 * Calcule Z-Score (détection statistique)
 */
function calculateZScore(value: number, values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calcule IQR (Interquartile Range)
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
 * Récupère anomalies depuis serveur (Supabase)
 */
export const useAnomalies = (filters?: {
  gravite?: 'faible' | 'moyenne' | 'critique';
  est_lue?: boolean;
  limite?: number;
}) => {
  return useQuery({
    queryKey: ['anomalies', filters],
    queryFn: async () => {
      let query = supabase
        .from('anomalies')
        .select(`
          *,
          province:provinces(id, nom, code),
          resultat:resultats_partiels(id, voix, taux_participation)
        `)
        .order('timestamp_detection', { ascending: false });

      if (filters?.gravite) {
        query = query.eq('gravite', filters.gravite);
      }
      if (filters?.est_lue !== undefined) {
        query = query.eq('est_lue', filters.est_lue);
      }
      if (filters?.limite) {
        query = query.limit(filters.limite);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AnomalieAvecDetails[];
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
};

/**
 * Compte les anomalies non lues
 */
export const useAnomaliesNonLuesCount = () => {
  return useQuery({
    queryKey: ['anomalies-non-lues-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomalies')
        .select('id', { count: 'exact', head: true })
        .eq('est_lue', false);

      if (error) throw error;
      return data?.length || 0;
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
};

/**
 * Récupère anomalies critiques par province
 */
export const useAnomaliesCritiquesParProvince = () => {
  return useQuery({
    queryKey: ['anomalies-critiques-par-province'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomalies')
        .select('province_id, province:provinces(nom, code)')
        .eq('gravite', 'critique')
        .eq('est_lue', false)
        .order('timestamp_detection', { ascending: false });

      if (error) throw error;

      const grouped = data.reduce((acc: any, anomalie: any) => {
        const provinceId = anomalie.province_id;
        if (!acc[provinceId]) {
          acc[provinceId] = { province: anomalie.province, count: 0 };
        }
        acc[provinceId].count++;
        return acc;
      }, {});

      return Object.values(grouped);
    },
    staleTime: 1000 * 30,
  });
};

/**
 * DÉTECTION CLIENT-SIDE (instantané)
 * Utilise les algorithmes statistiques pour alertes en temps réel
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

    // 1. Participation > 100%
    if (params.participation > 100.5) {
      anomalies.push({
        type: 'participation_100_pourcent',
        severity: 'critique',
        value: params.participation,
      });
    }

    // 2. Voix > Inscrits
    if (params.voix > params.inscrits * 1.05) {
      anomalies.push({
        type: 'voix_depasse_inscrits',
        severity: 'critique',
        value: params.voix / params.inscrits,
      });
    }

    // 3. Régression voix
    if (params.precedentVoix && params.voix < params.precedentVoix * 0.9) {
      anomalies.push({
        type: 'regression_voix',
        severity: 'moyen',
        value: params.voix / params.precedentVoix,
      });
    }

    // 4. Z-Score participation
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

    // 5. IQR participation
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
 * Participation par circonscription
 */
export function useParticipationByCirconscription(circonscriptionId?: string) {
  const { resultats } = useElectionStore();
  const filtered = circonscriptionId
    ? resultats.filter((r) => r.circonscription_id === circonscriptionId)
    : resultats;
  return filtered.map((r) => r.taux_participation).sort((a, b) => a - b);
}

/**
 * Détecte tendances suspectes
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

  return Object.entries(trends)
    .map(([circo, count]) => ({ circonscription_id: circo, anomaly_count: count }))
    .sort((a, b) => b.anomaly_count - a.anomaly_count);
}
