/**
 * Hook: useElectionAnalytics
 * Orchestre les analyses (prédictions, anomalies) et expose l'état
 */

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { electionApiService } from "@/services/electionApiIntegration";
import { predictFinalScore, evaluatePredictionQuality } from "@/lib/predictions";
import {
  detectAllAnomalies,
  evaluateOverallSeverity,
} from "@/lib/anomaly-advanced";

export interface AnalyticsState {
  predictions: any[];
  anomalies: any[];
  isLoading: boolean;
  error: string | null;
  processingStatus: "idle" | "processing" | "completed" | "error";
}

export function useElectionAnalytics(electionId: string | null) {
  const queryClient = useQueryClient();
  const [processingStatus, setProcessingStatus] = useState<
    "idle" | "processing" | "completed" | "error"
  >("idle");

  // Récupérer les prédictions
  const {
    data: predictions = [],
    isLoading: isPredictionsLoading,
    error: predictionsError,
  } = useQuery({
    queryKey: ["predictions", electionId],
    queryFn: async () => {
      if (!electionId) return [];
      return electionApiService.getPredictions(electionId);
    },
    enabled: !!electionId,
    refetchInterval: 30000, // Mettre à jour toutes les 30s
  });

  // Récupérer les anomalies
  const {
    data: anomalies = [],
    isLoading: isAnomaliesLoading,
    error: anomaliesError,
  } = useQuery({
    queryKey: ["anomalies", electionId],
    queryFn: async () => {
      if (!electionId) return [];
      return electionApiService.getAnomalies(electionId);
    },
    enabled: !!electionId,
    refetchInterval: 30000,
  });

  // Mutation: Traiter les résultats
  const processResultsMutation = useMutation({
    mutationFn: async (results: any[]) => {
      setProcessingStatus("processing");
      try {
        const result = await electionApiService.processResults({
          election_id: electionId!,
          results,
          auto_detect_anomalies: true,
          auto_predict: true,
        });
        setProcessingStatus("completed");
        return result;
      } catch (error) {
        setProcessingStatus("error");
        throw error;
      }
    },
    onSuccess: () => {
      // Invalider les caches
      queryClient.invalidateQueries({
        queryKey: ["predictions", electionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["anomalies", electionId],
      });
    },
  });

  // Mutation: Déclencher les prédictions
  const triggerPredictionsMutation = useMutation({
    mutationFn: async (provinceId?: string) => {
      return electionApiService.predictElectionResults({
        election_id: electionId!,
        province_id: provinceId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["predictions", electionId],
      });
    },
  });

  // Mutation: Déclencher la détection d'anomalies
  const triggerAnomalyDetectionMutation = useMutation({
    mutationFn: async (method?: string) => {
      return electionApiService.detectAnomalies({
        election_id: electionId!,
        method: (method as any) || "all",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["anomalies", electionId],
      });
    },
  });

  // S'abonner aux changements en temps réel
  useEffect(() => {
    if (!electionId) return;

    const anomalySubscription = electionApiService.subscribeToAnomalies(
      electionId,
      () => {
        queryClient.invalidateQueries({
          queryKey: ["anomalies", electionId],
        });
      }
    );

    const predictionSubscription =
      electionApiService.subscribeToPredictions(electionId, () => {
        queryClient.invalidateQueries({
          queryKey: ["predictions", electionId],
        });
      });

    return () => {
      anomalySubscription.unsubscribe();
      predictionSubscription.unsubscribe();
    };
  }, [electionId, queryClient]);

  // Calculer la sévérité globale
  const overallSeverity = evaluateOverallSeverity(anomalies);
  const predictionQuality = evaluatePredictionQuality(predictions);

  return {
    predictions,
    anomalies,
    processingStatus,
    overallSeverity,
    predictionQuality,
    isLoading:
      isPredictionsLoading ||
      isAnomaliesLoading ||
      processResultsMutation.isPending,
    error:
      predictionsError ||
      anomaliesError ||
      processResultsMutation.error,
    // Mutations
    processResults: processResultsMutation.mutate,
    triggerPredictions: triggerPredictionsMutation.mutate,
    triggerAnomalyDetection: triggerAnomalyDetectionMutation.mutate,
    // States
    isProcessingResults: processResultsMutation.isPending,
    isCalculatingPredictions: triggerPredictionsMutation.isPending,
    isDetectingAnomalies: triggerAnomalyDetectionMutation.isPending,
  };
}

/**
 * Hook: useElectionAlerts
 * Gère les alertes et notifications
 */
export function useElectionAlerts(electionId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: alerts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["unread_alerts", electionId],
    queryFn: async () => {
      if (!electionId) return [];
      return electionApiService.getUnreadAlerts(electionId);
    },
    enabled: !!electionId,
    refetchInterval: 15000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) =>
      electionApiService.markAlertAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["unread_alerts", electionId],
      });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: (alert: {
      type: string;
      titre: string;
      description: string;
      severite: "info" | "warning" | "critical";
    }) =>
      electionApiService.createAlert(
        electionId!,
        alert.type,
        alert.titre,
        alert.description,
        alert.severite
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["unread_alerts", electionId],
      });
    },
  });

  const criticalAlerts = alerts.filter(
    (a) => a.severite === "critical"
  );

  return {
    alerts,
    criticalAlerts,
    unreadCount: alerts.length,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    createAlert: createAlertMutation.mutate,
    isCreatingAlert: createAlertMutation.isPending,
  };
}
