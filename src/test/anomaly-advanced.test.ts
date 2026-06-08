/**
 * Tests unitaires: Advanced Anomaly Detection Module
 * Teste Z-score, IQR, règles métier et orchestration
 */

import { describe, it, expect } from "vitest";
import {
  detectZScoreAnomalies,
  detectIQRAnomalies,
  checkParticipationRate,
  checkTotalVotes,
  detectMovingAveragAnomalies,
  detectAllAnomalies,
  evaluateOverallSeverity,
  summarizeAnomaliesByProvince,
  DEFAULT_ANOMALY_CONFIG,
} from "@/lib/anomaly-advanced";

describe("Anomaly Detection Module", () => {
  describe("detectZScoreAnomalies", () => {
    it("devrait détecter les valeurs avec Z-score > seuil", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 52 },
        { bureau_id: "b3", taux: 49 },
        { bureau_id: "b4", taux: 99 }, // Aberrante
      ];

      const anomalies = detectZScoreAnomalies(samples, 2.5);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some((a) => a.bureau_id === "b4")).toBe(true);
    });

    it("ne devrait pas détecter si < 3 points", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 52 },
      ];

      const anomalies = detectZScoreAnomalies(samples);

      expect(anomalies).toHaveLength(0);
    });

    it("devrait inclure raison et détails", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 50 },
        { bureau_id: "b3", taux: 95 }, // Aberrante
      ];

      const anomalies = detectZScoreAnomalies(samples, 2);

      expect(anomalies[0].raison).toContain("Z-score");
      expect(anomalies[0].details.zscore).toBeDefined();
    });
  });

  describe("detectIQRAnomalies", () => {
    it("devrait détecter les valeurs hors IQR", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 51 },
        { bureau_id: "b3", taux: 52 },
        { bureau_id: "b4", taux: 53 },
        { bureau_id: "b5", taux: 100 }, // Hors IQR
      ];

      const anomalies = detectIQRAnomalies(samples, 1.5);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies.some((a) => a.bureau_id === "b5")).toBe(true);
    });

    it("ne devrait pas détecter si < 4 points", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 51 },
        { bureau_id: "b3", taux: 52 },
      ];

      const anomalies = detectIQRAnomalies(samples);

      expect(anomalies).toHaveLength(0);
    });

    it("devrait marquer comme critique si très extrême", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 51 },
        { bureau_id: "b3", taux: 52 },
        { bureau_id: "b4", taux: 53 },
        { bureau_id: "b5", taux: 200 }, // Extrême
      ];

      const anomalies = detectIQRAnomalies(samples, 1.5);

      expect(anomalies.some((a) => a.severity === "critical")).toBe(true);
    });
  });

  describe("checkParticipationRate", () => {
    it("devrait détecter un taux trop bas", () => {
      const anomaly = checkParticipationRate(5); // 5% < 10%

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe("participation_rate");
      expect(anomaly?.severity).toMatch(/high|critical|medium/);
    });

    it("devrait détecter un taux trop haut", () => {
      const anomaly = checkParticipationRate(100); // 100% > 95%

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe("participation_rate");
    });

    it("ne devrait pas détecter si dans les limites", () => {
      const anomaly = checkParticipationRate(50);

      expect(anomaly).toBeNull();
    });

    it("devrait respecter les limites configurables", () => {
      const config = {
        ...DEFAULT_ANOMALY_CONFIG,
        min_participation_rate: 20,
        max_participation_rate: 80,
      };

      const anomaly = checkParticipationRate(15, config);

      expect(anomaly).not.toBeNull();
    });
  });

  describe("checkTotalVotes", () => {
    it("devrait détecter si voix > inscrits", () => {
      const anomaly = checkTotalVotes(1100, 1000);

      expect(anomaly).not.toBeNull();
      expect(anomaly?.type).toBe("total_votes");
    });

    it("ne devrait pas détecter si ratio acceptable", () => {
      const anomaly = checkTotalVotes(1050, 1000); // 105% < 105% max

      expect(anomaly).toBeNull();
    });

    it("devrait marquer comme critique si très excessif", () => {
      const anomaly = checkTotalVotes(1300, 1000); // 130% > acceptable

      expect(anomaly).not.toBeNull();
      expect(anomaly?.severity).toMatch(/critical|high/);
    });
  });

  describe("detectMovingAveragAnomalies", () => {
    it("devrait détecter les écarts par rapport à la SMA", () => {
      const timeSeries = [
        { timestamp: "2026-06-01", value: 50 },
        { timestamp: "2026-06-02", value: 51 },
        { timestamp: "2026-06-03", value: 50 },
        { timestamp: "2026-06-04", value: 100 }, // Écart
        { timestamp: "2026-06-05", value: 51 },
      ];

      const anomalies = detectMovingAveragAnomalies(timeSeries, 3, 2);

      expect(anomalies.length).toBeGreaterThan(0);
    });

    it("ne devrait pas détecter si données stables", () => {
      const timeSeries = [
        { timestamp: "2026-06-01", value: 50 },
        { timestamp: "2026-06-02", value: 50 },
        { timestamp: "2026-06-03", value: 50 },
        { timestamp: "2026-06-04", value: 50 },
      ];

      const anomalies = detectMovingAveragAnomalies(
        timeSeries,
        3,
        2
      );

      expect(anomalies.length).toBe(0);
    });
  });

  describe("detectAllAnomalies", () => {
    it("devrait appliquer toutes les méthodes", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 51 },
        { bureau_id: "b3", taux: 100 }, // Hors limites
      ];

      const anomalies = detectAllAnomalies(samples);

      expect(anomalies.length).toBeGreaterThan(0);
      // Au moins l'une des méthodes devrait détecter
      expect(
        anomalies.some((a) => ["zscore", "iqr"].includes(a.type))
      ).toBe(true);
    });

    it("devrait dédupliquer les anomalies", () => {
      const samples = [
        { bureau_id: "b1", taux: 50 },
        { bureau_id: "b2", taux: 51 },
        { bureau_id: "b3", taux: 100 }, // Détecté par zscore et IQR
      ];

      const anomalies = detectAllAnomalies(samples);

      const b3Anomalies = anomalies.filter((a) => a.bureau_id === "b3");
      // Ne devrait pas avoir de doublon exact
      expect(
        b3Anomalies.filter((a) => a.type === "zscore").length
      ).toBeLessThanOrEqual(1);
    });
  });

  describe("evaluateOverallSeverity", () => {
    it("devrait retourner 'none' si pas d'anomalies", () => {
      const severity = evaluateOverallSeverity([]);

      expect(severity).toBe("none");
    });

    it("devrait retourner 'critical' si une seule anomalie est critique", () => {
      const anomalies = [
        {
          id: "a1",
          type: "zscore",
          methode: "Z-score",
          score: 3,
          raison: "",
          severity: "medium" as const,
          details: {},
          timestamp_detection: new Date().toISOString(),
        },
        {
          id: "a2",
          type: "total_votes",
          methode: "Règle",
          score: 1.2,
          raison: "",
          severity: "critical" as const,
          details: {},
          timestamp_detection: new Date().toISOString(),
        },
      ];

      const severity = evaluateOverallSeverity(anomalies);

      expect(severity).toBe("critical");
    });

    it("devrait retourner 'high' s'il n'y a que des high ou medium", () => {
      const anomalies = [
        {
          id: "a1",
          type: "zscore",
          methode: "Z-score",
          score: 3,
          raison: "",
          severity: "medium" as const,
          details: {},
          timestamp_detection: new Date().toISOString(),
        },
        {
          id: "a2",
          type: "iqr",
          methode: "IQR",
          score: 2,
          raison: "",
          severity: "high" as const,
          details: {},
          timestamp_detection: new Date().toISOString(),
        },
      ];

      const severity = evaluateOverallSeverity(anomalies);

      expect(severity).toBe("high");
    });
  });

  describe("summarizeAnomaliesByProvince", () => {
    it("devrait grouper les anomalies par province", () => {
      const anomalies = [
        {
          id: "a1",
          province_id: "p1",
          type: "zscore",
          methode: "",
          score: 1,
          raison: "",
          severity: "medium" as const,
          details: {},
          timestamp_detection: new Date().toISOString(),
        },
        {
          id: "a2",
          province_id: "p1",
          type: "iqr",
          methode: "",
          score: 2,
          raison: "",
          severity: "high" as const,
          details: {},
          timestamp_detection: new Date().toISOString(),
        },
        {
          id: "a3",
          province_id: "p2",
          type: "zscore",
          methode: "",
          score: 1,
          raison: "",
          severity: "low" as const,
          details: {},
          timestamp_detection: new Date().toISOString(),
        },
      ];

      const summary = summarizeAnomaliesByProvince(anomalies);

      expect(Object.keys(summary)).toHaveLength(2);
      expect(summary["p1"]).toHaveLength(2);
      expect(summary["p2"]).toHaveLength(1);
    });
  });
});
