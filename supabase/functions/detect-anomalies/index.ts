/**
 * Edge Function: Detect Anomalies
 * 
 * Applique Z-score, IQR et règles métier pour détecter les anomalies
 * 
 * POST /functions/v1/detect-anomalies
 * Body: { election_id: UUID, province_id?: UUID }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

interface AnomalyDetectionRequest {
  election_id: string;
  province_id?: string;
  method?: "all" | "zscore" | "iqr" | "business_rule";
}

interface DetectedAnomaly {
  bureau_id?: string;
  province_id?: string;
  type: string;
  methode: string;
  score: number;
  raison: string;
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, any>;
}

/**
 * Calcule les quartiles et l'IQR
 */
function calculateQuartiles(data: number[]) {
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
 * Détection Z-score
 */
function detectZScoreAnomalies(
  samples: Array<{
    bureau_id: string;
    taux: number;
  }>,
  threshold = 2.5
): DetectedAnomaly[] {
  if (samples.length < 3) return [];

  const taux = samples.map((s) => s.taux);
  const mean = taux.reduce((a, b) => a + b, 0) / taux.length;
  const variance =
    taux.reduce((a, b) => a + (b - mean) ** 2, 0) / taux.length;
  const std = Math.sqrt(variance) || 1;

  return samples
    .map((s) => {
      const zscore = (s.taux - mean) / std;
      return {
        bureau_id: s.bureau_id,
        type: "zscore",
        methode: "Z-score",
        score: Math.abs(zscore),
        raison: `Z-score=${zscore.toFixed(
          2
        )} (μ=${mean.toFixed(1)}%, σ=${std.toFixed(1)}%)`,
        severity:
          Math.abs(zscore) > 3.5
            ? "critical"
            : Math.abs(zscore) > 3
              ? "high"
              : "medium",
        details: { value: s.taux, mean, std, zscore },
      };
    })
    .filter((a) => Math.abs(a.details.zscore) >= threshold);
}

/**
 * Détection IQR
 */
function detectIQRAnomalies(
  samples: Array<{ bureau_id: string; taux: number }>,
  multiplier = 1.5
): DetectedAnomaly[] {
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
      bureau_id: s.bureau_id,
      type: "iqr",
      methode: "Écart Interquartile",
      score: s.taux,
      raison: `Hors IQR [${stats.lower_bound.toFixed(
        1
      )}–${stats.upper_bound.toFixed(1)}%]`,
      severity:
        s.taux < 5 || s.taux > 100
          ? "critical"
          : "high",
      details: {
        value: s.taux,
        q1: stats.q1,
        q3: stats.q3,
        iqr: stats.iqr,
      },
    }));
}

/**
 * Vérifier les règles métier
 */
function checkBusinessRules(
  resultats: Array<{
    bureau_id: string;
    voix: number;
    inscrits: number;
  }>
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  for (const result of resultats) {
    // Règle 1: Plus de voix que d'inscrits
    if (result.voix > result.inscrits) {
      anomalies.push({
        bureau_id: result.bureau_id,
        type: "total_votes",
        methode: "Règle métier",
        score: result.voix / (result.inscrits || 1),
        raison: `${result.voix} voix > ${result.inscrits} inscrits`,
        severity: "critical",
        details: { voix: result.voix, inscrits: result.inscrits },
      });
    }

    // Règle 2: Taux de participation invalide
    const taux = result.inscrits
      ? (result.voix / result.inscrits) * 100
      : 0;
    if (taux < 10 || taux > 95) {
      anomalies.push({
        bureau_id: result.bureau_id,
        type: "participation_rate",
        methode: "Règle métier",
        score: taux,
        raison: `Taux de participation ${taux.toFixed(1)}% hors limites`,
        severity: taux > 100 || taux < 0 ? "critical" : "medium",
        details: { taux },
      });
    }
  }

  return anomalies;
}

async function detectAnomalies(req: Request): Promise<Response> {
  try {
    const payload: AnomalyDetectionRequest = await req.json();

    if (!payload.election_id) {
      return new Response(
        JSON.stringify({ error: "election_id est requis" }),
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les résultats
    let query = supabase
      .from("resultats_partiels")
      .select(
        "id, bureau_id, province_id, voix, inscrits, taux_participation"
      )
      .eq("election_id", payload.election_id);

    if (payload.province_id) {
      query = query.eq("province_id", payload.province_id);
    }

    const { data: resultats, error } = await query;

    if (error) throw error;

    if (!resultats || resultats.length === 0) {
      return new Response(
        JSON.stringify({ anomalies: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const allAnomalies: DetectedAnomaly[] = [];

    // Z-score
    if (!payload.method || payload.method === "zscore" || payload.method === "all") {
      const participationByBureau = resultats.map((r: any) => ({
        bureau_id: r.bureau_id,
        taux: r.taux_participation || 0,
      }));
      allAnomalies.push(
        ...detectZScoreAnomalies(participationByBureau)
      );
    }

    // IQR
    if (!payload.method || payload.method === "iqr" || payload.method === "all") {
      const participationByBureau = resultats.map((r: any) => ({
        bureau_id: r.bureau_id,
        taux: r.taux_participation || 0,
      }));
      allAnomalies.push(...detectIQRAnomalies(participationByBureau));
    }

    // Business rules
    if (!payload.method || payload.method === "business_rule" || payload.method === "all") {
      const businessRules = resultats.map((r: any) => ({
        bureau_id: r.bureau_id,
        voix: r.voix || 0,
        inscrits: r.inscrits || 0,
      }));
      allAnomalies.push(...checkBusinessRules(businessRules));
    }

    // Dédupliquer
    const unique = new Map<string, DetectedAnomaly>();
    for (const anomaly of allAnomalies) {
      const key = `${anomaly.bureau_id}_${anomaly.type}`;
      if (
        !unique.has(key) ||
        anomaly.score > (unique.get(key)?.score || 0)
      ) {
        unique.set(key, anomaly);
      }
    }

    // Sauvegarder dans la DB
    const toInsert = Array.from(unique.values()).map((a) => ({
      election_id: payload.election_id,
      bureau_id: a.bureau_id || null,
      province_id: payload.province_id || null,
      type: a.type,
      methode: a.methode,
      gravite: a.severity,
      score: a.score,
      details: a.details,
      status: "detected",
    }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("anomalies")
        .insert(toInsert);

      if (insertError) {
        console.error("Erreur lors de la sauvegarde des anomalies:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        anomalies_count: unique.size,
        anomalies: Array.from(unique.values()),
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

Deno.serve(detectAnomalies);
