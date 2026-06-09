// src/lib/anomaly-utils.ts
// Utilitaires pour classification et traitement des anomalies
// Réutilisable côté frontend

export type AnomalySeverity = 'faible' | 'moyen' | 'critique';
export type AnomalyType =
  | 'zscore_participation'
  | 'iqr_participation'
  | 'participation_100_pourcent'
  | 'voix_depasse_inscrits'
  | 'regression_voix'
  | 'other';

export interface AnomalyClassification {
  type: AnomalyType;
  severity: AnomalySeverity;
  icon: string;
  color: string;
  description: string;
  actionable: boolean;
}

/**
 * Classifie une anomalie par type et gravité
 */
export function classifyAnomaly(
  typeAnomalie: string,
  gravite: AnomalySeverity
): AnomalyClassification {
  const typeMap: Record<string, Partial<AnomalyClassification>> = {
    zscore_participation: {
      type: 'zscore_participation',
      icon: '📊',
      description: 'Participation anormale (Z-Score)',
      actionable: true,
    },
    iqr_participation: {
      type: 'iqr_participation',
      icon: '📉',
      description: 'Participation hors limites interquartiles',
      actionable: true,
    },
    participation_100_pourcent: {
      type: 'participation_100_pourcent',
      icon: '⚠️',
      description: 'Participation dépasse 100%',
      actionable: true,
    },
    voix_depasse_inscrits: {
      type: 'voix_depasse_inscrits',
      icon: '🚨',
      description: 'Voix supérieures aux inscrits',
      actionable: true,
    },
    regression_voix: {
      type: 'regression_voix',
      icon: '📉',
      description: 'Régression anormale des voix',
      actionable: true,
    },
  };

  const baseClassification = typeMap[typeAnomalie] || {
    type: 'other',
    icon: 'ℹ️',
    description: 'Anomalie détectée',
    actionable: false,
  };

  // Couleurs selon gravité
  const colorMap: Record<AnomalySeverity, string> = {
    faible: 'text-blue-500 bg-blue-500/10',
    moyen: 'text-amber-500 bg-amber-500/10',
    critique: 'text-red-500 bg-red-500/10',
  };

  return {
    ...baseClassification,
    severity: gravite,
    color: colorMap[gravite],
  } as AnomalyClassification;
}

/**
 * Formatage d'une anomalie pour l'affichage
 */
export function formatAnomalyMessage(
  classification: AnomalyClassification,
  metadata?: {
    candidat?: string;
    circonscription?: string;
    value?: number;
  }
): string {
  let message = `${classification.icon} ${classification.description}`;

  if (metadata?.candidat) {
    message += ` - ${metadata.candidat}`;
  }
  if (metadata?.circonscription) {
    message += ` (${metadata.circonscription})`;
  }
  if (metadata?.value !== undefined) {
    message += ` [${metadata.value.toFixed(2)}]`;
  }

  return message;
}

/**
 * Groupement d'anomalies par type
 */
export function groupAnomaliesByType(
  anomalies: Array<{ type_anomalie: string; gravite: AnomalySeverity }>
): Record<string, AnomalyClassification[]> {
  const grouped: Record<string, AnomalyClassification[]> = {};

  anomalies.forEach((anomalie) => {
    const classification = classifyAnomaly(anomalie.type_anomalie, anomalie.gravite);
    if (!grouped[anomalie.type_anomalie]) {
      grouped[anomalie.type_anomalie] = [];
    }
    grouped[anomalie.type_anomalie].push(classification);
  });

  return grouped;
}

/**
 * Calcul du score de "risque" (0-100)
 */
export function calculateRiskScore(anomalies: Array<{ gravite: AnomalySeverity }>): number {
  const weights = {
    critique: 50,
    moyen: 25,
    faible: 5,
  };

  const totalScore = anomalies.reduce((sum, a) => {
    return sum + weights[a.gravite];
  }, 0);

  // Normalise à 100
  return Math.min(100, totalScore);
}

/**
 * Recommandations basées sur le type d'anomalie
 */
export function getRecommendation(
  classification: AnomalyClassification
): string {
  const recommendations: Record<AnomalyType, string> = {
    zscore_participation: '📋 Vérifier les données de participation de cette circonscription',
    iqr_participation: '🔍 Investiguer les écarts de participation',
    participation_100_pourcent: '🚨 CRITICAL : Vérifier immédiatement les données sources',
    voix_depasse_inscrits: '🚨 CRITICAL : Anomalie de cohésion des données',
    regression_voix: '⚠️ Vérifier la source des données précédentes',
    other: '❓ Vérifier les données brutes',
  };

  return recommendations[classification.type];
}
