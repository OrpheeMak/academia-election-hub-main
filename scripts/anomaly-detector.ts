// scripts/anomaly-detector.ts
// Algorithmes de détection d'anomalies : Z-score, IQR, règles métier
// Contexte académique RDC - Neutralité garantie

export interface AnomalyDetectionResult {
  is_anomalous: boolean;
  anomaly_type?: 'zscore' | 'iqr' | 'business_rule';
  z_score?: number;
  iqr_value?: number;
  gravite: 'faible' | 'moyen' | 'critique';
  description: string;
}

/**
 * Calcul Z-Score sur taux de participation
 * Formule : (valeur - moyenne) / écart-type
 * Seuil : |Z| > 2.5 → anomalie probable
 */
export function detectZScoreAnomaly(
  value: number,
  values: number[]
): AnomalyDetectionResult {
  if (values.length < 3) {
    return { is_anomalous: false, gravite: 'faible', description: 'Données insuffisantes' };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { is_anomalous: false, gravite: 'faible', description: 'Variance nulle' };
  }

  const z_score = (value - mean) / stdDev;
  const is_anomalous = Math.abs(z_score) > 2.5;

  return {
    is_anomalous,
    anomaly_type: is_anomalous ? 'zscore' : undefined,
    z_score: parseFloat(z_score.toFixed(4)),
    gravite: is_anomalous ? (Math.abs(z_score) > 3.5 ? 'critique' : 'moyen') : 'faible',
    description: is_anomalous
      ? `Taux participation anormal (Z=${z_score.toFixed(2)}) - Déviation extrême détectée`
      : 'Taux participation normal',
  };
}

/**
 * Détection par IQR (Interquartile Range)
 * Seuil : Valeur < Q1 - 1.5*IQR ou > Q3 + 1.5*IQR → anomalie
 */
export function detectIQRAnomaly(
  value: number,
  values: number[]
): AnomalyDetectionResult {
  if (values.length < 4) {
    return { is_anomalous: false, gravite: 'faible', description: 'Données insuffisantes pour IQR' };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length / 4);
  const q3Index = Math.floor((3 * sorted.length) / 4);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const is_anomalous = value < lowerBound || value > upperBound;

  return {
    is_anomalous,
    anomaly_type: is_anomalous ? 'iqr' : undefined,
    iqr_value: parseFloat(iqr.toFixed(4)),
    gravite: is_anomalous ? (value > upperBound ? 'critique' : 'moyen') : 'faible',
    description: is_anomalous
      ? `Valeur hors limites IQR (${lowerBound.toFixed(2)}-${upperBound.toFixed(2)})`
      : 'Valeur dans limites IQR',
  };
}

/**
 * Règles métier électorales (neutralité garantie)
 * Détecte : participation >100%, voix > inscrits, progression suspecte
 */
export function detectBusinessRuleAnomaly(
  participation: number,
  voix: number,
  inscrits: number,
  precedentVoix?: number
): AnomalyDetectionResult {
  // Règle 1 : Participation > 100%
  if (participation > 100.5) {
    return {
      is_anomalous: true,
      anomaly_type: 'business_rule',
      gravite: 'critique',
      description: `Participation > 100% (${participation.toFixed(2)}%) - Impossible physiquement`,
    };
  }

  // Règle 2 : Voix > inscrits estimés
  if (voix > inscrits * 1.05) {
    return {
      is_anomalous: true,
      anomaly_type: 'business_rule',
      gravite: 'critique',
      description: `Voix (${voix}) > inscrits estimés (${inscrits}) - Données cohésion`,
    };
  }

  // Règle 3 : Diminution anormale de voix (data corruption)
  if (precedentVoix !== undefined && voix < precedentVoix * 0.95) {
    return {
      is_anomalous: true,
      anomaly_type: 'business_rule',
      gravite: 'moyen',
      description: `Régression voix : ${precedentVoix} → ${voix}. Possible corruption données`,
    };
  }

  return {
    is_anomalous: false,
    gravite: 'faible',
    description: 'Règles métier passées',
  };
}

/**
 * Pipeline complet : détecte toutes anomalies en cascade
 */
export function runFullAnomalyDetection(params: {
  participation: number;
  voix: number;
  inscrits: number;
  precedentVoix?: number;
  participationHistorique?: number[];
  voixHistorique?: number[];
}): AnomalyDetectionResult {
  // 1. Règles métier (priorité haute)
  const businessResult = detectBusinessRuleAnomaly(
    params.participation,
    params.voix,
    params.inscrits,
    params.precedentVoix
  );
  if (businessResult.is_anomalous) {
    return businessResult;
  }

  // 2. Z-score sur participation
  if (params.participationHistorique && params.participationHistorique.length >= 3) {
    const zScoreResult = detectZScoreAnomaly(params.participation, params.participationHistorique);
    if (zScoreResult.is_anomalous) {
      return zScoreResult;
    }
  }

  // 3. IQR sur voix (si historique)
  if (params.voixHistorique && params.voixHistorique.length >= 4) {
    const iqrResult = detectIQRAnomaly(params.voix, params.voixHistorique);
    if (iqrResult.is_anomalous) {
      return iqrResult;
    }
  }

  // Pas d'anomalie
  return {
    is_anomalous: false,
    gravite: 'faible',
    description: 'Aucune anomalie détectée - Données cohérentes',
  };
}
