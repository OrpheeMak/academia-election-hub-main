/**
 * Edge Function: Process Results
 * 
 * Orchestre l'importation des résultats, le calcul des taux de participation
 * et déclenche les analyses (prédictions + anomalies)
 * 
 * POST /functions/v1/process-results
 * Body: { election_id: UUID, results: Array<{...}> }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

interface ResultToProcess {
  bureau_id: string;
  candidat_id: string;
  voix: number;
  inscrits?: number;
  province_id: string;
  circonscription_id?: string;
}

interface ProcessResultsRequest {
  election_id: string;
  results: ResultToProcess[];
  auto_detect_anomalies?: boolean;
  auto_predict?: boolean;
}

async function processResults(req: Request): Promise<Response> {
  try {
    const payload: ProcessResultsRequest = await req.json();

    if (!payload.election_id || !payload.results) {
      return new Response(
        JSON.stringify({
          error: "election_id et results sont requis",
        }),
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Grouper par bureau pour calculer les taux de participation
    const resultsByBureau = payload.results.reduce(
      (acc: Record<string, ResultToProcess[]>, result: ResultToProcess) => {
        if (!acc[result.bureau_id]) {
          acc[result.bureau_id] = [];
        }
        acc[result.bureau_id].push(result);
        return acc;
      },
      {}
    );

    // Préparer les données à insérer
    const resultatPartiels = [];

    for (const result of payload.results) {
      const bureauResults = resultsByBureau[result.bureau_id];
      const totalVoix = bureauResults.reduce(
        (sum: number, r: ResultToProcess) => sum + r.voix,
        0
      );

      const inscrits = result.inscrits || 1000; // Valeur par défaut
      const tauxParticipation = (totalVoix / inscrits) * 100;

      resultatPartiels.push({
        election_id: payload.election_id,
        province_id: result.province_id,
        circonscription_id: result.circonscription_id || null,
        bureau_id: result.bureau_id,
        candidat_id: result.candidat_id,
        voix: result.voix,
        inscrits,
        taux_participation: tauxParticipation,
        is_anomalie: tauxParticipation < 10 || tauxParticipation > 95,
        timestamp_saisie: new Date().toISOString(),
      });
    }

    // Insérer les résultats
    const { data: insertedResults, error: insertError } = await supabase
      .from("resultats_partiels")
      .insert(resultatPartiels)
      .select();

    if (insertError) {
      throw insertError;
    }

    const response: any = {
      success: true,
      results_inserted: insertedResults?.length || 0,
    };

    // Déclencher la détection d'anomalies
    if (payload.auto_detect_anomalies !== false) {
      try {
        const anomalyFunctionUrl = `${supabaseUrl}/functions/v1/detect-anomalies`;
        const anomalyResponse = await fetch(anomalyFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            election_id: payload.election_id,
          }),
        });

        const anomalyData = await anomalyResponse.json();
        response.anomalies = anomalyData;
      } catch (error) {
        console.error(
          "Erreur lors de la détection d'anomalies:",
          error
        );
        response.anomaly_detection_error =
          error instanceof Error
            ? error.message
            : "Erreur inconnue";
      }
    }

    // Déclencher les prédictions
    if (payload.auto_predict !== false) {
      try {
        const predictionFunctionUrl = `${supabaseUrl}/functions/v1/predict-election-results`;
        const predictionResponse = await fetch(
          predictionFunctionUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              election_id: payload.election_id,
            }),
          }
        );

        const predictionData = await predictionResponse.json();
        response.predictions = predictionData;
      } catch (error) {
        console.error(
          "Erreur lors de la prédiction:",
          error
        );
        response.prediction_error =
          error instanceof Error
            ? error.message
            : "Erreur inconnue";
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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

Deno.serve(processResults);
