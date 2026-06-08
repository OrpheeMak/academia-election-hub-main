/**
 * Service: Election API Integration
 * Orchestre tous les appels API vers Supabase et les Edge Functions
 * Intègre les prédictions, détection d'anomalies et gestion des résultats
 */

import { supabase } from "@/config/supabase";

/**
 * Types
 */
export interface ProcessingResult {
  success: boolean;
  results_inserted: number;
  predictions?: {
    success: boolean;
    predictions_count: number;
    predictions: any[];
  };
  anomalies?: {
    success: boolean;
    anomalies_count: number;
    anomalies: any[];
  };
  errors?: string[];
}

export interface PredictionRequest {
  election_id: string;
  province_id?: string;
  candidat_id?: string;
}

export interface AnomalyDetectionRequest {
  election_id: string;
  province_id?: string;
  method?: "all" | "zscore" | "iqr" | "business_rule";
}

export interface ResultToProcess {
  bureau_id: string;
  candidat_id: string;
  voix: number;
  inscrits?: number;
  province_id: string;
  circonscription_id?: string;
}

export interface ProcessResultsRequest {
  election_id: string;
  results: ResultToProcess[];
  auto_detect_anomalies?: boolean;
  auto_predict?: boolean;
}

/**
 * API Election Service
 */
export const electionApiService = {
  /**
   * Traiter les résultats électoraux en lot
   * Déclenche automatiquement les analyses (anomalies + prédictions)
   */
  async processResults(
    payload: ProcessResultsRequest
  ): Promise<ProcessingResult> {
    try {
      const response = await supabase.functions.invoke(
        "process-results",
        {
          body: payload,
        }
      );

      if (response.error) {
        throw response.error;
      }

      return response.data;
    } catch (error) {
      console.error("Erreur lors du traitement des résultats:", error);
      throw error;
    }
  },

  /**
   * Prédire les résultats finals basés sur les résultats partiels
   */
  async predictElectionResults(
    payload: PredictionRequest
  ): Promise<{
    success: boolean;
    predictions_count: number;
    predictions: any[];
  }> {
    try {
      const response = await supabase.functions.invoke(
        "predict-election-results",
        {
          body: payload,
        }
      );

      if (response.error) {
        throw response.error;
      }

      return response.data;
    } catch (error) {
      console.error("Erreur lors de la prédiction:", error);
      throw error;
    }
  },

  /**
   * Détecter les anomalies dans les résultats
   */
  async detectAnomalies(
    payload: AnomalyDetectionRequest
  ): Promise<{
    success: boolean;
    anomalies_count: number;
    anomalies: any[];
  }> {
    try {
      const response = await supabase.functions.invoke(
        "detect-anomalies",
        {
          body: payload,
        }
      );

      if (response.error) {
        throw response.error;
      }

      return response.data;
    } catch (error) {
      console.error("Erreur lors de la détection d'anomalies:", error);
      throw error;
    }
  },

  /**
   * Récupérer toutes les anomalies d'une élection
   */
  async getAnomalies(electionId: string) {
    const { data, error } = await supabase
      .from("anomalies")
      .select("*")
      .eq("election_id", electionId)
      .order("timestamp_detection", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Récupérer les prédictions d'une élection
   */
  async getPredictions(
    electionId: string,
    provinceId?: string
  ) {
    let query = supabase
      .from("predictions")
      .select("*")
      .eq("election_id", electionId);

    if (provinceId) {
      query = query.eq("province_id", provinceId);
    }

    const { data, error } = await query.order(
      "timestamp_prediction",
      {
        ascending: false,
      }
    );

    if (error) throw error;
    return data || [];
  },

  /**
   * Récupérer les résultats partiels avec pagination
   */
  async getPartialResults(electionId: string, limit = 100) {
    const { data, error, count } = await supabase
      .from("resultats_partiels")
      .select("*", { count: "exact" })
      .eq("election_id", electionId)
      .order("timestamp_saisie", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  /**
   * Sauvegarder un statut de traitement
   */
  async logProcessingStatus(
    electionId: string,
    status: "pending" | "processing" | "completed" | "error",
    config: any,
    stats: any
  ) {
    const { data, error } = await supabase
      .from("simulation_logs")
      .insert([
        {
          election_id: electionId,
          status,
          config,
          stats,
        },
      ])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  /**
   * Valider que l'utilisateur peut écrire des résultats (rôle moderator ou admin)
   */
  async canUserWriteResults(): Promise<boolean> {
    try {
      // Si pas d'authentification, c'est un utilisateur public
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Vérifier les rôles
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("app_role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Erreur lors de la vérification des rôles:", error);
        return false;
      }

      const hasWriteRole = roles?.some(
        (r) =>
          r.app_role === "admin" || r.app_role === "moderator"
      );
      return hasWriteRole || false;
    } catch (error) {
      console.error("Erreur lors de la vérification des droits:", error);
      return false;
    }
  },

  /**
   * Obtenir les statistiques globales d'une élection
   */
  async getElectionStats(electionId: string) {
    const { data, error } = await supabase
      .from("v_resultats_globaux")
      .select("*")
      .eq("election_id", electionId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data || null;
  },

  /**
   * Obtenir la participation par province
   */
  async getParticipationByProvince() {
    const { data, error } = await supabase
      .from("v_participation_province")
      .select("*");

    if (error) throw error;
    return data || [];
  },

  /**
   * Enregistrer une alerte
   */
  async createAlert(
    electionId: string,
    type: string,
    titre: string,
    description: string,
    severite: "info" | "warning" | "critical"
  ) {
    const { data, error } = await supabase
      .from("alertes")
      .insert([
        {
          election_id: electionId,
          type,
          titre,
          description,
          severite,
        },
      ])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  /**
   * Marquer une alerte comme lue
   */
  async markAlertAsRead(alertId: string) {
    const { data, error } = await supabase
      .from("alertes")
      .update({ est_lue: true })
      .eq("id", alertId)
      .select();

    if (error) throw error;
    return data?.[0];
  },

  /**
   * Récupérer les alertes non lues
   */
  async getUnreadAlerts(electionId: string) {
    const { data, error } = await supabase
      .from("alertes")
      .select("*")
      .eq("election_id", electionId)
      .eq("est_lue", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * S'abonner aux changements d'anomalies en temps réel
   */
  subscribeToAnomalies(
    electionId: string,
    callback: (anomaly: any) => void
  ) {
    const subscription = supabase
      .channel(`election_${electionId}_anomalies`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "anomalies",
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * S'abonner aux changements de résultats en temps réel
   */
  subscribeToResults(
    electionId: string,
    callback: (result: any) => void
  ) {
    const subscription = supabase
      .channel(`election_${electionId}_results`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "resultats_partiels",
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * S'abonner aux changements de prédictions
   */
  subscribeToPredictions(
    electionId: string,
    callback: (prediction: any) => void
  ) {
    const subscription = supabase
      .channel(`election_${electionId}_predictions`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "predictions",
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return subscription;
  },
};
