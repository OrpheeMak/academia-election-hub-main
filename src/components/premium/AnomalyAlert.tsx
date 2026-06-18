// src/components/premium/AnomalyAlert.tsx
// Affiche les anomalies détectées avec classification visuelle et animations

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';

export interface AnomalyAlertProps {
  id: string;
  type: string;
  description: string;
  gravite: 'faible' | 'moyen' | 'critique';
  timestamp: string;
  zScore?: number;
  onDismiss?: (id: string) => void;
}

const gravityConfig = {
  faible: {
    icon: Info,
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    title: 'Information',
  },
  moyen: {
    icon: AlertTriangle,
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    title: 'Alerte Modérée',
  },
  critique: {
    icon: AlertCircle,
    color: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300',
    badge: 'bg-red-500/20 text-red-700 dark:text-red-300',
    title: 'Alerte Critique',
  },
};

export const AnomalyAlert = React.memo(
  React.forwardRef<HTMLDivElement, AnomalyAlertProps>(
    ({ id, type, description, gravite, timestamp, zScore, onDismiss }, ref) => {
      const config = gravityConfig[gravite];
      const Icon = config.icon;
      const typeLabel = type ? type.replace(/_/g, ' ').toUpperCase() : 'ANOMALIE INCONNUE';

      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="mb-3"
        >
          <GlassCard className={cn('p-4', config.color)} hover={false}>
            <div className="flex items-start justify-between gap-3">
              {/* Icône + Contenu */}
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Type + Badge */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm">
                      {typeLabel}
                    </p>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', config.badge)}>
                      {config.title}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm opacity-90 mb-2 break-words">{description}</p>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 text-xs opacity-75">
                    <span>{new Date(timestamp).toLocaleTimeString('fr-FR')}</span>
                    {zScore !== undefined && <span>Z-Score: {zScore.toFixed(2)}</span>}
                  </div>
                </div>
              </div>

              {/* Bouton Fermeture */}
              {onDismiss && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDismiss(id)}
                  className="flex-shrink-0 mt-1 p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      );
    }
  )
);

AnomalyAlert.displayName = 'AnomalyAlert';

/**
 * Conteneur pour liste d'anomalies avec animation group
 */
interface AnomalyListProps {
  anomalies: AnomalyAlertProps[];
  onDismiss?: (id: string) => void;
  maxHeight?: string;
}

export const AnomalyList = React.memo<AnomalyListProps>(
  ({ anomalies, onDismiss, maxHeight = 'max-h-96' }) => {
    return (
      <div className={cn('overflow-y-auto', maxHeight)}>
        <AnimatePresence mode="popLayout">
          {anomalies.map((anomalie) => (
            <AnomalyAlert
              key={anomalie.id}
              {...anomalie}
              onDismiss={onDismiss}
            />
          ))}
        </AnimatePresence>

        {anomalies.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center text-gray-500 dark:text-gray-400"
          >
            ✅ Aucune anomalie détectée - Données cohérentes
          </motion.div>
        )}
      </div>
    );
  }
);

AnomalyList.displayName = 'AnomalyList';
