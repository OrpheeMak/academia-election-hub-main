/**
 * Module de détection d'anomalies statistiques et règles métier
 * Combine:
 * - Z-score (écarts-types)
 * - IQR (écart interquartile)
 * - Règles métier (participation, voix totales)
 * - Moyenne mobile (tendances)
 */

import {
  calculateZScore,
  calculateQuartiles,
  calculateSMA,
} from "./predictions";

/**
 * Anomalie détectée avec contexte complet
 */
export interface Anomaly {
  id: string;
  bureau_id?: string;
  province_id?: string;
  type:
    | "participation_rate"
    | "total_votes"
    | "zscore"
    | "iqr"
    | "moving_average"
    | "business_rule";
  methode: string;
  score: number;
  raison: string;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, any>;
  timestamp_detection: string;
}

/**
 * Configuration des seuils d'anomalies
 */
export interface AnomalyConfig {
  zscore_threshold: number; // ±2.5
  iqr_multiplier: number; // 1.5
  min_participation_rate: number; // 10%
  max_participation_rate: number; // 95%
  votes_to_registered_ratio_max: number; // 1.05 (5% marge)
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  zscore_threshold: 2.5,
  iqr_multiplier: 1.5,
  min_participation_rate: 10,
  max_participation_rate: 95,
  votes_to_registered_ratio_max: 1.05,
};

/**
 * Z-Score detection - identifie les valeurs très éloignées de la moyenne
 */
export function detectZScoreAnomalies(
  samples: { bureau_id: string; taux: number }[],
  threshold: number = 2.5
): Anomaly[] {
  if (samples.length < 3) return [];

  const taux = samples.map((s) => s.taux);
  const mean = taux.reduce((a, b) => a + b, 0) / taux.length;
  const variance =
    taux.reduce((a, b) => a + (b - mean) ** 2, 0) / taux.length;
  const std = Math.sqrt(variance) || 1;

  return samples
    .map((s) => {
      const zscore = calculateZScore(s.taux, mean, std);
      return {
        id: `zscore_${s.bureau_id}_${Date.now()}`,
        bureau_id: s.bureau_id,
        type: "zscore" as const,
        methode: "Z-score",
        score: Math.abs(zscore),
        raison: `Z-score=${zscore.toFixed(
          2
        )} (μ=${mean.toFixed(1)}%, σ=${std.toFixed(
          1
        )}%) — Écart significatif de la moyenne`,
        severity:
          Math.abs(zscore) > 3.5
            ? "critical"
            : Math.abs(zscore) > 3
              ? "high"
              : "medium",
        details: {
          value: s.taux,
          mean,
          std,
          zscore,
        },
        timestamp_detection: new Date().toISOString(),
      };
    })
    .filter((h) => Math.abs(h.details.zscore) >= threshold);
}

/**
 * IQR detection - identifie les valeurs hors quartiles
 */
export function detectIQRAnomalies(
  samples: { bureau_id: string; taux: number }[],
  multiplier: number = 1.5
): Anomaly[] {
  if (samples.length < 4) return [];

  const taux = samples.map((s) => s.taux);
  const stats = calculateQuartiles(taux);

  return samples
    .filter(
      (s) =>
        s.taux < stats.lower_bound ||
        s.taux > stats.upper_bound
    )
    .map((s) => ({
      id: `iqr_${s.bureau_id}_${Date.now()}`,
      bureau_id: s.bureau_id,
      type: "iqr" as const,
      methode: "Écart Interquartile (IQR)",
      score: s.taux,
      raison: `Valeur hors IQR [${stats.lower_bound.toFixed(
        1
      )}–${stats.upper_bound.toFixed(1)}%] (Q1=${stats.q1.toFixed(
        1
      )}, Q3=${stats.q3.toFixed(1)}, IQR=${stats.iqr.toFixed(1)})`,
      severity:
        s.taux < 5 || s.taux > 100
          ? "critical"
          : s.taux < stats.lower_bound * 0.8 ||
              s.taux > stats.upper_bound * 1.2
            ? "high"
            : "medium",
      details: {
        value: s.taux,
        q1: stats.q1,
        q3: stats.q3,
        iqr: stats.iqr,
        lower_bound: stats.lower_bound,
        upper_bound: stats.upper_bound,
      },
      timestamp_detection: new Date().toISOString(),
    }));
}

/**
 * Détecte les anomalies de taux de participation
 */
export function checkParticipationRate(
  rate: number,
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Anomaly | null {
  if (
    rate < config.min_participation_rate ||
    rate > config.max_participation_rate
  ) {
    const severity =
      rate < 0 || rate > 100
        ? "critical"
        : rate < config.min_participation_rate * 0.5 ||
            rate > config.max_participation_rate * 1.1
          ? "high"
          : "medium";

    return {
      id: `participation_${Date.now()}`,
      type: "participation_rate" as const,
      methode: "Règle métier - Taux de participation",
      score: rate,
      raison: `Taux de participation hors limites: ${rate.toFixed(
        1
      )}% (acceptable: ${config.min_participation_rate}–${config.max_participation_rate}%)`,
      severity,
      details: {
        rate,
        min: config.min_participation_rate,
        max: config.max_participation_rate,
      },
      timestamp_detection: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Détecte si le nombre de voix dépasse les inscrits
 */
export function checkTotalVotes(
  votes: number,
  registeredVoters: number,
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Anomaly | null {
  const ratio = votes / (registeredVoters || 1);

  if (ratio > config.votes_to_registered_ratio_max) {
    return {
      id: `total_votes_${Date.now()}`,
      type: "total_votes" as const,
      methode: "Règle métier - Total des voix",
      score: ratio,
      raison: `Ratio voix/inscrits excessif: ${(
        ratio * 100
      ).toFixed(1)}% (max: ${(
        config.votes_to_registered_ratio_max * 100
      ).toFixed(1)}%)`,
      severity:
        ratio > 1.2
          ? "critical"
          : ratio > 1.1
            ? "high"
            : "medium",
      details: {
        votes,
        registered_voters: registeredVoters,
        ratio,
        max_ratio:
          config.votes_to_registered_ratio_max,
      },
      timestamp_detection: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Détecte les anomalies de tendance avec moyenne mobile
 */
export function detectMovingAveragAnomalies(
  timeSeries: { timestamp: string; value: number }[],
  window: number = 3,
  threshold_std_multiplier: number = 2
): Anomaly[] {
  if (timeSeries.length < window) return [];

  const values = timeSeries.map((ts) => ts.value);
  const sma = calculateSMA(
    timeSeries.map((ts) => ({
      timestamp: ts.timestamp,
      votes: ts.value,
      bureaux_depouilles: 0,
      inscrits_total: 0,
    })),
    window
  );

  // Calculer l'écart-type de la différence (valeur - SMA)
  const differences: number[] = [];
  for (let i = window - 1; i < values.length; i++) {
    if (!isNaN(sma[i])) {
      differences.push(values[i] - sma[i]);
    }
  }

  if (differences.length < 2) return [];

  const mean_diff =
    differences.reduce((a, b) => a + b, 0) / differences.length;
  const variance =
    differences.reduce(
      (a, b) => a + (b - mean_diff) ** 2,
      0
    ) / differences.length;
  const std_diff = Math.sqrt(variance);

  const anomalies: Anomaly[] = [];

  for (let i = window - 1; i < values.length; i++) {
    if (isNaN(sma[i])) continue;

    const diff = values[i] - sma[i];
    if (Math.abs(diff) > threshold_std_multiplier * std_diff) {
      anomalies.push({
        id: `ma_${i}_${Date.now()}`,
        type: "moving_average" as const,
        methode: "Moyenne mobile (tendance)",
        score: Math.abs(diff),
        raison: `Écart significatif vs SMA(${window}): ${(
          diff
        ).toFixed(0)} (seuil: ${(
          threshold_std_multiplier * std_diff
        ).toFixed(0)})`,
        severity:
          Math.abs(diff) >
          threshold_std_multiplier * 1.5 * std_diff
            ? "high"
            : "medium",
        details: {
          timestamp: timeSeries[i].timestamp,
          value: values[i],
          sma: sma[i],
          diff,
          std_diff,
        },
        timestamp_detection: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

/**
 * Orchestrateur principal de détection d'anomalies
 * Applique toutes les méthodes et retourne les anomalies détectées
 */
export function detectAllAnomalies(
  participationByBureau: {
    bureau_id: string;
    taux: number;
  }[],
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Z-score
  anomalies.push(
    ...detectZScoreAnomalies(
      participationByBureau,
      config.zscore_threshold
    )
  );

  // IQR
  anomalies.push(
    ...detectIQRAnomalies(
      participationByBureau,
      config.iqr_multiplier
    )
  );

  // Dédupliquer les anomalies par bureau_id + type
  const uniqueAnomalies = new Map<string, Anomaly>();
  for (const anomaly of anomalies) {
    const key = `${anomaly.bureau_id}_${anomaly.type}`;
    if (
      !uniqueAnomalies.has(key) ||
      anomaly.score >
        uniqueAnomalies.get(key)!.score
    ) {
      uniqueAnomalies.set(key, anomaly);
    }
  }

  return Array.from(uniqueAnomalies.values());
}

/**
 * Évalue la sévérité globale d'un ensemble d'anomalies
 */
export function evaluateOverallSeverity(
  anomalies: Anomaly[]
): "none" | "low" | "medium" | "high" | "critical" {
  if (anomalies.length === 0) return "none";

  const severities = anomalies.map((a) => a.severity);
  if (severities.includes("critical")) return "critical";
  if (severities.includes("high")) return "high";
  if (severities.includes("medium")) return "medium";
  return "low";
}

/**
 * Agrège les anomalies par province pour résumé
 */
export function summarizeAnomaliesByProvince(
  anomalies: Anomaly[]
): Record<string, Anomaly[]> {
  const summary: Record<string, Anomaly[]> = {};

  for (const anomaly of anomalies) {
    const key = anomaly.province_id || "unknown";
    if (!summary[key]) {
      summary[key] = [];
    }
    summary[key].push(anomaly);
  }

  return summary;
}
