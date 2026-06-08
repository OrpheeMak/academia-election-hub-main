/**
 * Edge Function: Predict Election Results
 * 
 * Applique les algorithmes de régression et moyennes mobiles
 * pour prédire les résultats finaux basés sur les résultats partiels
 * 
 * POST /functions/v1/predict-election-results
 * Body: { election_id: UUID, province_id?: UUID }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

interface PredictionRequest {
  election_id: string;
  province_id?: string;
  candidat_id?: string;
}

interface PredictionResult {
  candidat_id: string;
  score_predit: number;
  intervalle_bas: number;
  intervalle_haut: number;
  confidence: number;
  method: string;
}

/**
 * Calcule la moyenne mobile simple
 */
function calculateSMA(values: number[], period: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - period + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/**
 * Calcule la régression linéaire
 */
function linearRegression(
  data: Array<{ x: number; y: number }>
): {
  slope: number;
  intercept: number;
  r_squared: number;
} {
  if (data.length < 2) throw new Error("Au moins 2 points requis");

  const n = data.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0,
    sumYY = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssTotal = sumYY - n * meanY * meanY;
  const ssResidual = sumYY - intercept * sumY - slope * sumXY;
  const r_squared = Math.max(0, 1 - ssResidual / ssTotal);

  return { slope, intercept, r_squared };
}

async function predictElectionResults(req: Request): Promise<Response> {
  try {
    // Parse request
    const payload: PredictionRequest = await req.json();

    if (!payload.election_id) {
      return new Response(
        JSON.stringify({ error: "election_id est requis" }),
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer tous les résultats pour cette élection
    let query = supabase
      .from("resultats_partiels")
      .select(`
        id,
        candidat_id,
        province_id,
        voix,
        inscrits,
        taux_participation,
        timestamp_saisie,
        bureau_id
      `)
      .eq("election_id", payload.election_id);

    if (payload.province_id) {
      query = query.eq("province_id", payload.province_id);
    }

    if (payload.candidat_id) {
      query = query.eq("candidat_id", payload.candidat_id);
    }

    const { data: resultats, error: resultatError } =
      await query.order("timestamp_saisie");

    if (resultatError) {
      throw resultatError;
    }

    if (!resultats || resultats.length === 0) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Grouper par candidat
    const groupedByCandidel = resultats.reduce(
      (acc: Record<string, any[]>, result: any) => {
        if (!acc[result.candidat_id]) {
          acc[result.candidat_id] = [];
        }
        acc[result.candidat_id].push(result);
        return acc;
      },
      {}
    );

    // Générer prédictions par candidat
    const predictions: PredictionResult[] = [];

    for (const [candidat_id, candidatResults] of Object.entries(
      groupedByCandidel
    )) {
      const voixArray = (candidatResults as any[]).map((r) => r.voix);

      // Supposer que nous avons le % de bureaux dépouillés
      const x = (candidatResults as any[]).map(
        (_, i) =>
          (i + 1) / (candidatResults as any[]).length
      );
      const y = voixArray;

      const regressionData = x.map((xi, i) => ({
        x: xi,
        y: y[i],
      }));

      const regression = linearRegression(regressionData);
      const predictedTotal = regression.slope * 1 + regression.intercept;

      // Moyenne mobile
      const sma = calculateSMA(voixArray, Math.min(3, voixArray.length));
      const lastSMA = sma[sma.length - 1] || predictedTotal;

      // Combinaison weighted
      const score =
        0.6 * predictedTotal + 0.4 * lastSMA;

      predictions.push({
        candidat_id: String(candidat_id),
        score_predit: Math.round(score),
        intervalle_bas: Math.max(0, Math.round(score * 0.95)),
        intervalle_haut: Math.round(score * 1.05),
        confidence: regression.r_squared,
        method: "hybrid_sma_regression",
      });
    }

    // Sauvegarder les prédictions
    const { error: insertError } = await supabase
      .from("predictions")
      .insert(
        predictions.map((p) => ({
          election_id: payload.election_id,
          province_id: payload.province_id || null,
          candidat_id: p.candidat_id,
          score_predit: p.score_predit,
          intervalle_bas: p.intervalle_bas,
          intervalle_haut: p.intervalle_haut,
          confidence: Math.round(p.confidence * 100),
          model_version: "1.0.0",
          timestamp_prediction: new Date().toISOString(),
        }))
      );

    if (insertError) {
      console.error("Erreur lors de la sauvegarde des prédictions:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        predictions_count: predictions.length,
        predictions,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

Deno.serve(predictElectionResults);
