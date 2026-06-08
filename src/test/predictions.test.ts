/**
 * Tests unitaires: Predictions Module
 * Teste les calculs SMA, régression linéaire et prédictions
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateSMA,
  linearRegression,
  calculateZScore,
  calculateQuartiles,
  detectOutliers,
  predictFinalScore,
  evaluatePredictionQuality,
} from "@/lib/predictions";

describe("Predictions Module", () => {
  describe("calculateSMA", () => {
    it("devrait retourner un tableau de même longueur", () => {
      const data = [
        { timestamp: "2026-06-01", votes: 100, bureaux_depouilles: 0.1, inscrits_total: 1000 },
        { timestamp: "2026-06-02", votes: 110, bureaux_depouilles: 0.2, inscrits_total: 1000 },
        { timestamp: "2026-06-03", votes: 120, bureaux_depouilles: 0.3, inscrits_total: 1000 },
      ];

      const result = calculateSMA(data, 2);

      expect(result).toHaveLength(3);
    });

    it("devrait retourner NaN pour les premiers points", () => {
      const data = [
        { timestamp: "2026-06-01", votes: 100, bureaux_depouilles: 0.1, inscrits_total: 1000 },
        { timestamp: "2026-06-02", votes: 110, bureaux_depouilles: 0.2, inscrits_total: 1000 },
      ];

      const result = calculateSMA(data, 3);

      expect(isNaN(result[0])).toBe(true);
      expect(isNaN(result[1])).toBe(true);
    });

    it("devrait calculer la SMA correctement", () => {
      const data = [
        { timestamp: "2026-06-01", votes: 100, bureaux_depouilles: 0.1, inscrits_total: 1000 },
        { timestamp: "2026-06-02", votes: 110, bureaux_depouilles: 0.2, inscrits_total: 1000 },
        { timestamp: "2026-06-03", votes: 120, bureaux_depouilles: 0.3, inscrits_total: 1000 },
        { timestamp: "2026-06-04", votes: 130, bureaux_depouilles: 0.4, inscrits_total: 1000 },
      ];

      const result = calculateSMA(data, 2);

      expect(isNaN(result[0])).toBe(true);
      expect(result[1]).toBe(105); // (100 + 110) / 2
      expect(result[2]).toBe(115); // (110 + 120) / 2
      expect(result[3]).toBe(125); // (120 + 130) / 2
    });

    it("devrait retourner un tableau vide pour données vides", () => {
      const result = calculateSMA([], 3);
      expect(result).toHaveLength(0);
    });
  });

  describe("linearRegression", () => {
    it("devrait calculer la pente et intercept correctement", () => {
      const data = [
        { x: 0.2, y: 200 },
        { x: 0.4, y: 400 },
        { x: 0.6, y: 600 },
        { x: 0.8, y: 800 },
        { x: 1.0, y: 1000 },
      ];

      const result = linearRegression(data);

      expect(result.slope).toBeCloseTo(1000, 0);
      expect(result.intercept).toBeCloseTo(0, 0);
      expect(result.r_squared).toBeCloseTo(1, 2); // Relation parfaite
    });

    it("devrait throw si moins de 2 points", () => {
      const data = [{ x: 1, y: 10 }];

      expect(() => linearRegression(data)).toThrow();
    });

    it("devrait retourner une prédiction raisonnable", () => {
      const data = [
        { x: 0.25, y: 250 },
        { x: 0.5, y: 500 },
        { x: 0.75, y: 750 },
      ];

      const result = linearRegression(data);

      expect(result.predicted_total).toBeCloseTo(1000, 0);
    });
  });

  describe("calculateZScore", () => {
    it("devrait retourner 0 pour une valeur égale à la moyenne", () => {
      const zscore = calculateZScore(50, 50, 10);
      expect(zscore).toBe(0);
    });

    it("devrait retourner 1 pour +1 std déviation", () => {
      const zscore = calculateZScore(60, 50, 10);
      expect(zscore).toBe(1);
    });

    it("devrait retourner -1.5 pour -1.5 std déviation", () => {
      const zscore = calculateZScore(35, 50, 10);
      expect(zscore).toBe(-1.5);
    });

    it("devrait retourner 0 si std dév = 0", () => {
      const zscore = calculateZScore(50, 50, 0);
      expect(zscore).toBe(0);
    });
  });

  describe("calculateQuartiles", () => {
    it("devrait calculer les quartiles correctement", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const result = calculateQuartiles(data);

      expect(result.q1).toBeLessThanOrEqual(3);
      expect(result.q2).toBeGreaterThanOrEqual(4);
      expect(result.q2).toBeLessThanOrEqual(6);
      expect(result.q3).toBeGreaterThanOrEqual(7);
      expect(result.iqr).toBe(result.q3 - result.q1);
    });

    it("devrait identifier les bornes correctement", () => {
      const data = [10, 20, 30, 40, 50];

      const result = calculateQuartiles(data);

      expect(result.lower_bound).toBeLessThan(result.q1);
      expect(result.upper_bound).toBeGreaterThan(result.q3);
    });
  });

  describe("detectOutliers", () => {
    it("devrait détecter les valeurs aberrantes", () => {
      const data = [1, 2, 3, 4, 5, 100]; // 100 est une aberration

      const outliers = detectOutliers(data);

      expect(outliers.length).toBeGreaterThan(0);
      expect(outliers).toContain(5); // Index du dernier élément
    });

    it("ne devrait pas détecter d'aberrants dans une distribution normale", () => {
      const data = [10, 11, 12, 13, 14, 15, 16];

      const outliers = detectOutliers(data);

      expect(outliers.length).toBe(0);
    });

    it("devrait retourner un tableau vide pour données < 4", () => {
      const outliers = detectOutliers([1, 2, 3]);
      expect(outliers).toHaveLength(0);
    });
  });

  describe("predictFinalScore", () => {
    it("devrait retourner null si pas de données actuelles", () => {
      const result = predictFinalScore([], []);
      expect(result).toBeNull();
    });

    it("devrait générer une prédiction", () => {
      const current = [
        { timestamp: "2026-06-01", votes: 100, bureaux_depouilles: 0.2, inscrits_total: 1000 },
        { timestamp: "2026-06-02", votes: 110, bureaux_depouilles: 0.4, inscrits_total: 1000 },
        { timestamp: "2026-06-03", votes: 120, bureaux_depouilles: 0.6, inscrits_total: 1000 },
      ];

      const result = predictFinalScore([], current);

      expect(result).not.toBeNull();
      expect(result?.score_predit).toBeGreaterThan(0);
      expect(result?.intervalle_bas).toBeLessThanOrEqual(result!.score_predit);
      expect(result?.intervalle_haut).toBeGreaterThanOrEqual(result!.score_predit);
    });
  });

  describe("evaluatePredictionQuality", () => {
    it("devrait retourner un score entre 0 et 100", () => {
      const predictions = [
        {
          candidat_id: "1",
          score_predit: 1000,
          intervalle_bas: 950,
          intervalle_haut: 1050,
          confidence: 0.95,
          methode: "hybrid",
          timestamp: new Date().toISOString(),
        },
      ];

      const quality = evaluatePredictionQuality(predictions);

      expect(quality).toBeGreaterThanOrEqual(0);
      expect(quality).toBeLessThanOrEqual(100);
    });

    it("devrait retourner 0 pour un tableau vide", () => {
      const quality = evaluatePredictionQuality([]);
      expect(quality).toBe(0);
    });
  });
});
