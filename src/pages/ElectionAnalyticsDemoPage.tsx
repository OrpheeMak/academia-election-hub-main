/**
 * Page Exemple: Intégration Complète
 * 
 * Cette page démontre l'utilisation intégrée de tous les modules:
 * - Importation des résultats
 * - Détection d'anomalies
 * - Prédictions électorales
 * - Visualisation en temps réel
 * - Gestion des alertes
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import {
  DashboardChart,
  ParticipationChart,
  AnomalyIndicator,
} from "@/components/dashboard/Charts";
import { useElectionAnalytics, useElectionAlerts } from "@/hooks/useElectionAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Example data - remplacer par des vraies données
const EXAMPLE_RESULTS = [
  {
    bureau_id: "bureau-001",
    candidat_id: "candidat-alice",
    voix: 150,
    inscrits: 1000,
    province_id: "kinshasa",
  },
  {
    bureau_id: "bureau-001",
    candidat_id: "candidat-bob",
    voix: 120,
    inscrits: 1000,
    province_id: "kinshasa",
  },
  {
    bureau_id: "bureau-002",
    candidat_id: "candidat-alice",
    voix: 165,
    inscrits: 1000,
    province_id: "kinshasa",
  },
  {
    bureau_id: "bureau-002",
    candidat_id: "candidat-bob",
    voix: 130,
    inscrits: 1000,
    province_id: "kinshasa",
  },
];

interface VoteData {
  candidat: string;
  voix: number;
  pourcentage: number;
  parti: string;
}

interface ParticipationData {
  timestamp: string;
  taux: number;
  votants: number;
  inscrits: number;
}

/**
 * Page Principale avec Intégration Complète
 */
export function ElectionAnalyticsDemoPage() {
  const electionId = "election-2026-06-06"; // À remplacer par ID réel
  const [votesData, setVotesData] = useState<VoteData[]>([]);
  const [participationData, setParticipationData] = useState<ParticipationData[]>([]);

  // Hooks analytiques
  const {
    predictions,
    anomalies,
    processingStatus,
    overallSeverity,
    predictionQuality,
    isLoading,
    processResults,
    triggerPredictions,
    triggerAnomalyDetection,
    isProcessingResults,
    isCalculatingPredictions,
    isDetectingAnomalies,
  } = useElectionAnalytics(electionId);

  // Hooks alertes
  const {
    alerts,
    criticalAlerts,
    unreadCount,
    markAsRead,
    createAlert,
  } = useElectionAlerts(electionId);

  // Simuler l'importation de résultats
  const handleImportResults = async () => {
    try {
      processResults(EXAMPLE_RESULTS);

      // Simuler la mise à jour des données
      setTimeout(() => {
        setVotesData([
          {
            candidat: "Alice Dupont",
            voix: 315,
            pourcentage: 53.4,
            parti: "Parti A",
          },
          {
            candidat: "Bob Legrand",
            voix: 250,
            pourcentage: 42.5,
            parti: "Parti B",
          },
          {
            candidat: "Charlie Martin",
            voix: 35,
            pourcentage: 5.9,
            parti: "Parti C",
          },
        ]);

        setParticipationData([
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            taux: 8.5,
            votants: 85,
            inscrits: 1000,
          },
          {
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            taux: 18.2,
            votants: 182,
            inscrits: 1000,
          },
          {
            timestamp: new Date().toISOString(),
            taux: 27.5,
            votants: 275,
            inscrits: 1000,
          },
        ]);
      }, 500);
    } catch (error) {
      console.error("Erreur lors de l'importation:", error);
      createAlert({
        type: "error",
        titre: "Erreur d'importation",
        description: String(error),
        severite: "critical",
      });
    }
  };

  // Calculer les statistiques
  const totalAnomalies = anomalies.length;
  const criticalAnomalies = anomalies.filter((a) => a.severity === "critical").length;
  const averagePredictionConfidence =
    predictions.length > 0
      ? Math.round(
          predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) /
            predictions.length *
            100
        )
      : 0;

  const severityColors = {
    none: "bg-green-100 text-green-800",
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold">Tableau de Bord Analytique</h1>
        <p className="text-gray-600">
          Prédictions électorales · Détection d'anomalies · Participation en temps réel
        </p>
      </motion.div>

      {/* Alertes critiques */}
      {criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {criticalAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{alert.titre}</strong>: {alert.description}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(alert.id)}
                  className="ml-2"
                >
                  Marquer comme lu
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </motion.div>
      )}

      {/* Statut du traitement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Statut du Traitement</span>
            <Badge
              variant={
                processingStatus === "completed"
                  ? "secondary"
                  : processingStatus === "error"
                    ? "destructive"
                    : "outline"
              }
            >
              {processingStatus === "processing" && (
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              )}
              {processingStatus.charAt(0).toUpperCase() +
                processingStatus.slice(1)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {/* KPI: Anomalies */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Anomalies détectées</div>
              <div className="text-3xl font-bold text-blue-600">
                {totalAnomalies}
              </div>
              {criticalAnomalies > 0 && (
                <div className="text-xs text-red-600 mt-2">
                  🔴 {criticalAnomalies} critique{criticalAnomalies > 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* KPI: Sévérité */}
            <div className={`${severityColors[overallSeverity]} p-4 rounded-lg`}>
              <div className="text-sm">Sévérité globale</div>
              <div className="text-2xl font-bold capitalize">
                {overallSeverity}
              </div>
            </div>

            {/* KPI: Qualité prédictions */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Qualité prédictions</div>
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(predictionQuality)}%
              </div>
            </div>

            {/* KPI: Confiance */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Confiance moyenne</div>
              <div className="text-3xl font-bold text-green-600">
                {averagePredictionConfidence}%
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleImportResults}
              disabled={isProcessingResults}
              className="gap-2"
            >
              {isProcessingResults && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              Importer résultats d'exemple
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerPredictions(undefined)}
              disabled={isCalculatingPredictions}
            >
              {isCalculatingPredictions && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              Actualiser prédictions
            </Button>

            <Button
              variant="outline"
              onClick={() => triggerAnomalyDetection("all")}
              disabled={isDetectingAnomalies}
            >
              {isDetectingAnomalies && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              Analyser anomalies
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {votesData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <DashboardChart
              data={votesData}
              title="Résultats des candidats"
              chartType="bar"
            />
          </motion.div>
        )}

        {participationData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ParticipationChart
              data={participationData}
              title="Évolution du taux de participation"
            />
          </motion.div>
        )}
      </div>

      {/* Anomalies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AnomalyIndicator
          anomalies={anomalies}
          showDetails={true}
          maxVisible={10}
        />
      </motion.div>

      {/* Prédictions détaillées */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Prédictions détaillées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions.slice(0, 5).map((pred) => (
                <div
                  key={pred.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      Candidat: {pred.candidat_id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-600">
                      Score: {Math.round(pred.score_predit)}
                      {" "} (IC: [{pred.intervalle_bas}, {pred.intervalle_haut}])
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {Math.round((pred.confidence || 0) * 100)}% confiance
                    </div>
                    <Badge variant="outline">{pred.model_version}</Badge>
                  </div>
                </div>
              ))}
              {predictions.length > 5 && (
                <div className="text-center text-sm text-gray-600 p-3">
                  ... et {predictions.length - 5} autre{predictions.length - 5 > 1 ? "s" : ""} prédiction{predictions.length - 5 > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severite === "critical"
                      ? "border-red-500 bg-red-50"
                      : alert.severite === "warning"
                        ? "border-yellow-500 bg-yellow-50"
                        : "border-blue-500 bg-blue-50"
                  }`}
                >
                  <div className="font-medium">{alert.titre}</div>
                  <div className="text-sm text-gray-700">{alert.description}</div>
                  {!alert.est_lue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(alert.id)}
                      className="mt-2"
                    >
                      Marquer comme lu
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* État de chargement */}
      {isLoading && (
        <div className="text-center p-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      )}
    </div>
  );
}

export default ElectionAnalyticsDemoPage;
