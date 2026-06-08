/**
 * Module de prédiction électorale
 * Implémente les algorithmes côté client pour minimiser la latence
 * - Moyennes Mobiles (SMA)
 * - Régression Linéaire Simple
 * - Prédictions avec intervalles de confiance
 */

/**
 * Données chronologiques pour prédictions
 */
export interface TimeSeriesPoint {
  timestamp: string;
  votes: number;
  bureaux_depouilles: number;
  inscrits_total: number;
}

/**
 * Résultat de régression linéaire
 */
export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r_squared: number;
  predicted_total: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
}

/**
 * Résultat de prédiction électorale
 */
export interface PredictionResult {
  candidat_id: string;
  score_predit: number;
  intervalle_bas: number;
  intervalle_haut: number;
  confidence: number;
  methode: "sma" | "regression" | "hybride";
  timestamp: string;
}

/**
 * Calcule la moyenne mobile simple (SMA) d'une série temporelle
 * @param data - Série de points avec votes
 * @param period - Période de la moyenne mobile (défaut: 5)
 * @returns Tableau des moyennes mobiles
 *
 * @example
 * const data = [
 *   { timestamp: '2026-06-01', votes: 1000 },
 *   { timestamp: '2026-06-02', votes: 1100 },
 *   { timestamp: '2026-06-03', votes: 1050 },
 * ];
 * const sma = calculateSMA(data, 2);
 * // [NaN, 1050, 1075]
 */
export function calculateSMA(
  data: TimeSeriesPoint[],
  period: number = 5
): number[] {
  if (!data || data.length === 0) return [];

  const sma: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // Pas assez de données pour calculer la SMA
      sma.push(NaN);
    } else {
      // Calculer la moyenne des votes sur la période
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, curr) => acc + curr.votes, 0);
      sma.push(sum / period);
    }
  }

  return sma;
}

/**
 * Calcule une régression linéaire entre le % de bureaux dépouillés et les voix
 * @param data - Données avec bureaux_depouilles et inscrits_total
 * @returns Coefficients de régression + prédiction finale
 *
 * @example
 * const data = [
 *   { bureaux_depouilles: 0.2, votes: 200, inscrits_total: 1000 },
 *   { bureaux_depouilles: 0.4, votes: 420, inscrits_total: 1000 },
 *   { bureaux_depouilles: 0.6, votes: 620, inscrits_total: 1000 },
 *   { bureaux_depouilles: 0.8, votes: 820, inscrits_total: 1000 },
 * ];
 * const result = linearRegression(data);
 */
export function linearRegression(
  data: TimeSeriesPoint[]
): LinearRegressionResult {
  if (data.length < 2) {
    throw new Error("Au moins 2 points de données sont nécessaires");
  }

  // Préparer les points: x = % bureaux dépouillés, y = voix
  const points = data.map((d) => ({
    x: d.bureaux_depouilles,
    y: d.votes,
  }));

  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0,
    sumYY = 0;

  for (let i = 0; i < n; i++) {
    sumX += points[i].x;
    sumY += points[i].y;
    sumXY += points[i].x * points[i].y;
    sumXX += points[i].x * points[i].x;
    sumYY += points[i].y * points[i].y;
  }

  // Calcul des coefficients
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Coefficient de détermination (R²)
  const meanY = sumY / n;
  const ssTotal = sumYY - (n * meanY * meanY);
  const ssResidual = sumYY - intercept * sumY - slope * sumXY;
  const r_squared = 1 - ssResidual / ssTotal;

  // Prédiction pour 100% de bureaux dépouillés
  const predicted_total = slope * 1 + intercept;

  // Intervalle de confiance (95%)
  const residuals = points.map((p) => p.y - (slope * p.x + intercept));
  const mse =
    residuals.reduce((sum, res) => sum + res * res, 0) / (n - 2);
  const std_error = Math.sqrt(mse);
  const t_critical = 1.96; // Approximation normale pour n > 30

  return {
    slope,
    intercept,
    r_squared: Math.max(0, r_squared), // R² peut être négatif en cas d'ajustement très faible
    predicted_total,
    confidence_interval: {
      lower: predicted_total - t_critical * std_error,
      upper: predicted_total + t_critical * std_error,
    },
  };
}

/**
 * Prédit le score final d'un candidat basé sur les résultats partiels
 * @param historical - Données historiques (élections précédentes)
 * @param current - Données actuelles (dépouillement en cours)
 * @returns Prédiction avec intervalle
 */
export function predictFinalScore(
  historical: TimeSeriesPoint[],
  current: TimeSeriesPoint[]
): PredictionResult | null {
  if (!current || current.length === 0) {
    return null;
  }

  try {
    // Méthode 1: Régression linéaire sur données actuelles
    const regression = linearRegression(current);

    // Méthode 2: Moyenne mobile simple
    const sma = calculateSMA(current, Math.min(3, current.length));
    const lastSMA = sma[sma.length - 1];

    // Moyenne pondérée des deux méthodes
    const weight_regression = 0.6;
    const weight_sma = 0.4;

    const predicted_score =
      weight_regression * regression.predicted_total +
      weight_sma * (lastSMA || regression.predicted_total);

    // Intervalle de confiance combiné
    const ic_width =
      regression.confidence_interval.upper -
      regression.confidence_interval.lower;

    return {
      candidat_id: "",
      score_predit: Math.round(predicted_score),
      intervalle_bas: Math.max(
        0,
        Math.round(predicted_score - ic_width / 2)
      ),
      intervalle_haut: Math.round(predicted_score + ic_width / 2),
      confidence: regression.r_squared,
      methode: "hybride",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erreur lors de la prédiction:", error);
    return null;
  }
}

/**
 * Calcule le Z-score pour une valeur
 * @param value - Valeur à évaluer
 * @param mean - Moyenne de la population
 * @param stdDev - Écart-type de la population
 * @returns Z-score
 */
export function calculateZScore(
  value: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Calcule les quartiles et l'IQR
 * @param data - Tableau de valeurs numériques
 * @returns Quartiles et IQR
 */
export interface QuartileStats {
  q1: number;
  q2: number; // Median
  q3: number;
  iqr: number;
  lower_bound: number;
  upper_bound: number;
}

export function calculateQuartiles(data: number[]): QuartileStats {
  const sorted = [...data].sort((a, b) => a - b);
  const len = sorted.length;

  const q1 = sorted[Math.floor(len * 0.25)];
  const q2 = sorted[Math.floor(len * 0.5)];
  const q3 = sorted[Math.floor(len * 0.75)];
  const iqr = q3 - q1;

  return {
    q1,
    q2,
    q3,
    iqr,
    lower_bound: q1 - 1.5 * iqr,
    upper_bound: q3 + 1.5 * iqr,
  };
}

/**
 * Détecte les valeurs aberrantes basées sur l'IQR
 * @param data - Tableau de valeurs
 * @returns Indices des valeurs aberrantes
 */
export function detectOutliers(data: number[]): number[] {
  if (data.length < 4) return [];

  const stats = calculateQuartiles(data);
  const outliers: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (
      data[i] < stats.lower_bound ||
      data[i] > stats.upper_bound
    ) {
      outliers.push(i);
    }
  }

  return outliers;
}

/**
 * Évalue la qualité d'une prédiction basée sur la confiance et la stabilité
 * @param predictions - Historique de prédictions
 * @returns Score de qualité (0-100)
 */
export function evaluatePredictionQuality(
  predictions: PredictionResult[]
): number {
  if (predictions.length === 0) return 0;

  // Qualité basée sur:
  // 1. Confiance (R²)
  // 2. Stabilité (variance entre prédictions)
  // 3. Intervalle de confiance (plus petit = mieux)

  const avgConfidence =
    predictions.reduce((sum, p) => sum + p.confidence, 0) /
    predictions.length;

  const scores = predictions.map((p) => p.score_predit);
  const meanScore =
    scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + (s - meanScore) ** 2, 0) /
    scores.length;
  const stability = 1 - Math.min(variance / meanScore, 1);

  const avgICWidth =
    predictions.reduce(
      (sum, p) => sum + (p.intervalle_haut - p.intervalle_bas),
      0
    ) / predictions.length;
  const meanScore_avg = meanScore || 1;
  const precision =
    1 -
    Math.min(
      avgICWidth / (meanScore_avg * 0.1),
      1
    );

  // Score pondéré
  return Math.round(
    avgConfidence * 0.4 + stability * 0.3 + precision * 0.3
  ) * 100;
}
