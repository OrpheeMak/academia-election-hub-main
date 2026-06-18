// src/components/premium/ElectionChart.tsx
// Visualisations Recharts : courbes voix, participation, histogrammes par circonscription

import React, { useMemo } from 'react';
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
} from 'recharts';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import type { Resultat } from '@/store/electionStore';

// Palette de couleurs (neutre, accessible)
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * Graphique 1 : Courbe participation au fil du temps
 */
interface ParticipationChartProps {
  data: Resultat[];
}

export const ParticipationChart = React.memo<ParticipationChartProps>(({ data }) => {
  const chartData = useMemo(() => {
    // Agrège par timestamp avec moyenne participation
    const grouped = data.reduce(
      (acc, r) => {
        const time = new Date(r.timestamp_insertion).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        if (!acc[time]) {
          acc[time] = { time, participation: 0, count: 0 };
        }
        acc[time].participation += r.taux_participation;
        acc[time].count += 1;
        return acc;
      },
      {} as Record<string, any>
    );

    return Object.values(grouped)
      .map((g: any) => ({
        time: g.time,
        participation: parseFloat((g.participation / g.count).toFixed(2)),
      }))
      .slice(-20); // Derniers 20 points
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <GlassCard className="p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          📊 Taux de Participation en Temps Réel
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              formatter={(value) => `${Number(value).toFixed(1)}%`}
            />
            <Line
              type="monotone"
              dataKey="participation"
              stroke="#3b82f6"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              strokeWidth={2}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </motion.div>
  );
});

ParticipationChart.displayName = 'ParticipationChart';

/**
 * Graphique 2 : Distribution voix par candidat (Pie chart)
 */
interface VoteDistributionProps {
  data: Resultat[];
  candidats: Array<{ id: string; nom: string; colour: string }>;
}

export const VoteDistributionChart = React.memo<VoteDistributionProps>(
  ({ data, candidats }) => {
    const chartData = useMemo(() => {
      const voxParCandidat = data.reduce(
        (acc, r) => {
          const existing = acc.find((c) => c.candidat_id === r.candidat_id);
          if (existing) {
            existing.voix += r.voix;
          } else {
            const candidat = candidats.find((c) => c.id === r.candidat_id);
            acc.push({
              candidat_id: r.candidat_id,
              nom: candidat?.nom || 'Inconnu',
              voix: r.voix,
              colour: candidat?.colour || '#ccc',
            });
          }
          return acc;
        },
        [] as any[]
      );

      return voxParCandidat.sort((a, b) => b.voix - a.voix);
    }, [data, candidats]);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            🗳️ Distribution des Voix par Candidat
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="voix"
                nameKey="nom"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ nom, percent }) => `${nom} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.colour} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => Number(value).toLocaleString('fr-FR')} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>
    );
  }
);

VoteDistributionChart.displayName = 'VoteDistributionChart';

/**
 * Graphique 3 : Voix par circonscription (Bar chart)
 */
interface VotesByCirconscriptionProps {
  data: Resultat[];
  circonscriptions: Array<{ id: string; nom: string }>;
}

export const VotesByCirconscriptionChart = React.memo<VotesByCirconscriptionProps>(
  ({ data, circonscriptions }) => {
    const chartData = useMemo(() => {
      const voxParCirco = data.reduce(
        (acc, r) => {
          const existing = acc.find((c) => c.circonscription_id === r.circonscription_id);
          if (existing) {
            existing.voix += r.voix;
          } else {
            const circo = circonscriptions.find((c) => c.id === r.circonscription_id);
            acc.push({
              circonscription_id: r.circonscription_id,
              nom: circo?.nom || 'Inconnue',
              voix: r.voix,
            });
          }
          return acc;
        },
        [] as any[]
      );

      return voxParCirco.sort((a, b) => b.voix - a.voix);
    }, [data, circonscriptions]);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            📍 Votes par Circonscription
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="nom" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
                formatter={(value) => Number(value).toLocaleString('fr-FR')}
              />
              <Bar dataKey="voix" fill="#3b82f6" isAnimationActive={true} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>
    );
  }
);

VotesByCirconscriptionChart.displayName = 'VotesByCirconscriptionChart';
