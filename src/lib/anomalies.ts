// Détection d'anomalies statistiques légères et interprétables

export interface AnomalyHit {
  bureau_id: string;
  taux: number;
  score: number;
  methode: "zscore" | "iqr" | "moyenne_mobile";
  raison: string;
}

export function detectZScore(samples: { bureau_id: string; taux: number }[], threshold = 2.5): AnomalyHit[] {
  if (samples.length < 3) return [];
  const taux = samples.map((s) => s.taux);
  const mean = taux.reduce((a, b) => a + b, 0) / taux.length;
  const variance = taux.reduce((a, b) => a + (b - mean) ** 2, 0) / taux.length;
  const std = Math.sqrt(variance) || 1;
  return samples
    .map((s) => ({
      bureau_id: s.bureau_id,
      taux: s.taux,
      score: +((s.taux - mean) / std).toFixed(2),
      methode: "zscore" as const,
      raison: `Z-score=${((s.taux - mean) / std).toFixed(2)} (μ=${mean.toFixed(1)}%, σ=${std.toFixed(1)})`,
    }))
    .filter((h) => Math.abs(h.score) >= threshold);
}

export function detectIQR(samples: { bureau_id: string; taux: number }[], k = 1.5): AnomalyHit[] {
  if (samples.length < 4) return [];
  const sorted = [...samples].map((s) => s.taux).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  const low = q1 - k * iqr;
  const high = q3 + k * iqr;
  return samples
    .filter((s) => s.taux < low || s.taux > high)
    .map((s) => ({
      bureau_id: s.bureau_id,
      taux: s.taux,
      score: +s.taux.toFixed(2),
      methode: "iqr" as const,
      raison: `Hors IQR [${low.toFixed(1)}–${high.toFixed(1)}%] (Q1=${q1.toFixed(1)}, Q3=${q3.toFixed(1)})`,
    }));
}

export function movingAverage(values: number[], window = 3): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}