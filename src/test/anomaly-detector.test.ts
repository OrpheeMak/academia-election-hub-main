// src/test/anomaly-detector.test.ts
// Tests des algorithmes de détection d'anomalies (Z-score, IQR)

import { describe, it, expect } from 'vitest';
import {
  detectZScoreAnomaly,
  detectIQRAnomaly,
  detectBusinessRuleAnomaly,
  runFullAnomalyDetection,
} from '../scripts/anomaly-detector';

describe('Anomaly Detection - Z-Score', () => {
  it('détecte une valeur avec Z-score > 2.5', () => {
    const values = [50, 52, 51, 53, 49]; // Moyenne ~51
    const outlier = 80; // Extrême

    const result = detectZScoreAnomaly(outlier, values);

    expect(result.is_anomalous).toBe(true);
    expect(result.anomaly_type).toBe('zscore');
    expect(result.z_score).toBeGreaterThan(2.5);
  });

  it('ne détecte pas de valeur normale', () => {
    const values = [50, 52, 51, 53, 49];
    const normal = 51;

    const result = detectZScoreAnomaly(normal, values);

    expect(result.is_anomalous).toBe(false);
  });

  it('retourne gravité critique si |Z| > 3.5', () => {
    const values = [50, 50, 50, 50, 50]; // Variance très faible
    const outlier = 100;

    const result = detectZScoreAnomaly(outlier, values);

    expect(result.is_anomalous).toBe(true);
    expect(['critique', 'moyen']).toContain(result.gravite);
  });
});

describe('Anomaly Detection - IQR', () => {
  it('détecte une valeur hors limites IQR', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const outlier = 200; // Extrême

    const result = detectIQRAnomaly(outlier, values);

    expect(result.is_anomalous).toBe(true);
    expect(result.anomaly_type).toBe('iqr');
  });

  it('accepte une valeur dans limites IQR', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const normal = 50;

    const result = detectIQRAnomaly(normal, values);

    expect(result.is_anomalous).toBe(false);
  });
});

describe('Anomaly Detection - Business Rules', () => {
  it('détecte participation > 100%', () => {
    const result = detectBusinessRuleAnomaly(
      105, // participation > 100%
      1000,
      2000
    );

    expect(result.is_anomalous).toBe(true);
    expect(result.anomaly_type).toBe('business_rule');
    expect(result.gravite).toBe('critique');
  });

  it('détecte voix > inscrits', () => {
    const result = detectBusinessRuleAnomaly(80, 2200, 2000); // voix > inscrits

    expect(result.is_anomalous).toBe(true);
    expect(result.anomaly_type).toBe('business_rule');
    expect(result.gravite).toBe('critique');
  });

  it('détecte régression voix', () => {
    const result = detectBusinessRuleAnomaly(50, 500, 1000, 1000); // 1000 → 500

    expect(result.is_anomalous).toBe(true);
    expect(result.anomaly_type).toBe('business_rule');
  });

  it('accepte données cohérentes', () => {
    const result = detectBusinessRuleAnomaly(75, 800, 1000, 790);

    expect(result.is_anomalous).toBe(false);
  });
});

describe('Full Anomaly Detection Pipeline', () => {
  it('applique en cascade : règles métier → Z-score → IQR', () => {
    const result = runFullAnomalyDetection({
      participation: 50,
      voix: 800,
      inscrits: 1000,
      precedentVoix: 790,
      participationHistorique: [45, 48, 50, 49, 47],
    });

    // Pas d'anomalie si données cohérentes
    expect(result.is_anomalous).toBe(false);
  });

  it('priorité règles métier si anomalie', () => {
    const result = runFullAnomalyDetection({
      participation: 105, // > 100% → Immédiate
      voix: 1000,
      inscrits: 2000,
    });

    expect(result.is_anomalous).toBe(true);
    expect(result.anomaly_type).toBe('business_rule');
  });
});
