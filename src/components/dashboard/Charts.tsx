/**
 * Composants de visualisation des données électorales
 * Intègre Recharts pour les graphiques interactifs
 *
 * Composants:
 * - DashboardChart: Barres/lignes pour répartition des voix
 * - ParticipationChart: Ligne pour évolution du taux de participation
 * - AnomalyIndicator: Icône + alerte pour anomalies
 */

import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Anomaly } from "@/lib/anomaly-advanced";

/**
 * Props pour DashboardChart
 */
export interface DashboardChartProps {
  data: Array<{
    candidat: string;
    voix: number;
    pourcentage: number;
    parti?: string;
  }>;
  title: string;
  chartType?: "bar" | "line" | "pie";
  showPercentage?: boolean;
  colors?: string[];
}

/**
 * DashboardChart - Affiche la répartition des voix par candidat
 * Peut être en barres, lignes ou camembert
 */
export function DashboardChart({
  data,
  title,
  chartType = "bar",
  showPercentage = true,
  colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ],
}: DashboardChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, idx) => ({
    ...item,
    fill: colors[idx % colors.length],
  }));

  const chart =
    chartType === "bar" ? (
      <BarChart data={chartData} margin={{
        top: 20,
        right: 30,
        left: 0,
        bottom: 5,
      }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="candidat" angle={-45} textAnchor="end" />
        <YAxis />
        <Tooltip
          formatter={(value: any) => {
            if (typeof value === "number") {
              return [
                value.toLocaleString(),
                showPercentage ? "Voix" : "",
              ];
            }
            return value;
          }}
        />
        <Legend />
        <Bar dataKey="voix" fill="#3b82f6" name="Voix" />
        {showPercentage && (
          <Bar
            dataKey="pourcentage"
            fill="#10b981"
            name="%"
            yAxisId="right"
          />
        )}
        <YAxis yAxisId="right" orientation="right" />
      </BarChart>
    ) : chartType === "line" ? (
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="candidat" angle={-45} textAnchor="end" />
        <YAxis />
        <Tooltip
          formatter={(value: any) => {
            if (typeof value === "number") {
              return [value.toLocaleString(), "Voix"];
            }
            return value;
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="voix"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Voix"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="pourcentage"
          stroke="#10b981"
          strokeWidth={2}
          name="%"
          connectNulls
        />
      </LineChart>
    ) : (
      <PieChart>
        <Pie
          data={chartData}
          dataKey="voix"
          nameKey="candidat"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ candidat, pourcentage }) =>
            `${candidat}: ${pourcentage.toFixed(1)}%`
          }
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => {
            if (typeof value === "number") {
              return [value.toLocaleString(), "Voix"];
            }
            return value;
          }}
        />
      </PieChart>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <TrendingUp className="w-4 h-4" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          {chart}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Props pour ParticipationChart
 */
export interface ParticipationChartProps {
  data: Array<{
    timestamp: string;
    taux: number;
    votants?: number;
    inscrits?: number;
  }>;
  title?: string;
  showTrend?: boolean;
}

/**
 * ParticipationChart - Affiche l'évolution du taux de participation
 */
export function ParticipationChart({
  data,
  title = "Évolution du taux de participation",
  showTrend = true,
}: ParticipationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </CardContent>
      </Card>
    );
  }

  // Formater les données pour le graphique
  const chartData = data.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  // Calculer la tendance (taux moyen)
  const avgTaux =
    data.reduce((sum, d) => sum + d.taux, 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {showTrend && (
            <span className="text-sm font-normal text-gray-600">
              Moyenne: {avgTaux.toFixed(1)}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(value: any) => {
                if (typeof value === "number") {
                  return [value.toFixed(1) + "%", "Taux"];
                }
                return value;
              }}
            />
            <Legend />

            <Line
              type="monotone"
              dataKey="taux"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Taux participation"
              connectNulls
              dot={{ r: 3 }}
            />

            {showTrend && (
              <Line
                type="linear"
                dataKey={() => avgTaux}
                stroke="#10b981"
                strokeDasharray="5 5"
                name="Moyenne"
                isAnimationActive={false}
              />
            )}

            {data.some((d) => d.votants !== undefined) && (
              <Bar dataKey="votants" fill="#f59e0b" name="Votants" />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Taux min</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.min(...data.map((d) => d.taux)).toFixed(1)}%
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Taux max</div>
            <div className="text-2xl font-bold text-green-600">
              {Math.max(...data.map((d) => d.taux)).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Props pour AnomalyIndicator
 */
export interface AnomalyIndicatorProps {
  anomalies: Anomaly[];
  showDetails?: boolean;
  maxVisible?: number;
}

/**
 * AnomalyIndicator - Affiche les anomalies détectées
 * Icône de couleur + message d'alerte
 */
export function AnomalyIndicator({
  anomalies,
  showDetails = true,
  maxVisible = 5,
}: AnomalyIndicatorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!anomalies || anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            État de l'élection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600 font-medium">✓ Aucune anomalie détectée</p>
        </CardContent>
      </Card>
    );
  }

  // Grouper par sévérité
  const severityColors: Record<string, { bg: string; text: string; icon: string }> = {
    critical: {
      bg: "bg-red-50",
      text: "text-red-700",
      icon: "🔴",
    },
    high: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      icon: "🟠",
    },
    medium: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      icon: "🟡",
    },
    low: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      icon: "🔵",
    },
  };

  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const severityOrder = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return (
      severityOrder[a.severity as keyof typeof severityOrder] -
      severityOrder[b.severity as keyof typeof severityOrder]
    );
  });

  const visibleAnomalies = sortedAnomalies.slice(
    0,
    maxVisible
  );
  const hiddenCount = Math.max(
    0,
    sortedAnomalies.length - maxVisible
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Anomalies détectées ({anomalies.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleAnomalies.map((anomaly, idx) => {
            const colors =
              severityColors[
              anomaly.severity as keyof typeof severityColors
              ];
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={anomaly.id}
                className={`${colors.bg} ${colors.text} p-4 rounded-lg cursor-pointer transition-all`}
                onClick={() =>
                  setExpandedIndex(
                    isExpanded ? null : idx
                  )
                }
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">
                    {colors.icon}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {anomaly.methode}
                    </div>
                    <div className="text-sm mt-1">
                      {anomaly.raison}
                    </div>

                    {showDetails && isExpanded && (
                      <div className="mt-3 text-xs border-t pt-2 space-y-1">
                        <div>
                          <strong>Type:</strong>{" "}
                          {anomaly.type}
                        </div>
                        {anomaly.bureau_id && (
                          <div>
                            <strong>Bureau:</strong>{" "}
                            {anomaly.bureau_id}
                          </div>
                        )}
                        {anomaly.province_id && (
                          <div>
                            <strong>Province:</strong>{" "}
                            {anomaly.province_id}
                          </div>
                        )}
                        <div>
                          <strong>Score:</strong>{" "}
                          {anomaly.score.toFixed(2)}
                        </div>
                        <div>
                          <strong>Détection:</strong>{" "}
                          {new Date(
                            anomaly.timestamp_detection
                          ).toLocaleString("fr-FR")}
                        </div>
                        {Object.keys(anomaly.details)
                          .length > 0 && (
                          <details>
                            <summary>Détails</summary>
                            <pre className="mt-1 text-xs bg-white/50 p-1 rounded overflow-auto max-h-32">
                              {JSON.stringify(
                                anomaly.details,
                                null,
                                2
                              )}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase px-2 py-1 bg-white/30 rounded">
                    {anomaly.severity}
                  </span>
                </div>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <div className="text-center text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
              {hiddenCount} autre{hiddenCount > 1 ? "s" : ""}{" "}
              anomalie{hiddenCount > 1 ? "s" : ""} détectée{hiddenCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Props pour VotesByCirconscriptionChart
 */
export interface VotesByCirconscriptionChartProps {
  data: Array<{
    circonscription: string;
    candidat: string;
    voix: number;
  }>;
}

/**
 * VotesByCirconscriptionChart - Affiche les voix par circonscription
 */
export function VotesByCirconscriptionChart({
  data,
}: VotesByCirconscriptionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Voix par circonscription</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center text-gray-500">
          Aucune donnée disponible
        </CardContent>
      </Card>
    );
  }

  // Agréger par circonscription
  const aggregated = data.reduce(
    (acc, item) => {
      const key = item.circonscription;
      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += item.voix;
      return acc;
    },
    {} as Record<string, number>
  );

  const chartData = Object.entries(aggregated).map(
    ([circonscription, voix]) => ({
      circonscription,
      voix,
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voix par circonscription</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="circonscription"
              angle={-45}
              textAnchor="end"
            />
            <YAxis />
            <Tooltip
              formatter={(value: any) => {
                if (typeof value === "number") {
                  return [value.toLocaleString(), "Voix"];
                }
                return value;
              }}
            />
            <Legend />
            <Bar dataKey="voix" fill="#3b82f6" name="Voix" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
