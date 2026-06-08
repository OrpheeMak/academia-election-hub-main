// src/components/premium/KPIStat.tsx
// Affiche une statistique clé avec icône, trend, et animation

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassCard } from './GlassCard';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPIStatProps {
  label: string;
  value: string | number;
  unit?: string;
  Icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
  color?: 'primary' | 'success' | 'warning' | 'danger';
  delay?: number;
}

const colorClasses = {
  primary: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
};

export const KPIStat = React.memo<KPIStatProps>(
  ({ label, value, unit, Icon, trend, color = 'primary', delay = 0 }) => {
    const colorClass = colorClasses[color];

    return (
      <GlassCard delay={delay} hover={false}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay }}
          className="flex items-start justify-between"
        >
          {/* Icône + Label */}
          <div className="flex-1">
            <div className={cn('mb-3 w-fit rounded-lg p-3 bg-white/20', colorClass)}>
              <Icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>

            {/* Valeur */}
            <motion.div
              key={value}
              layout
              className="mt-2"
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
                {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
              </p>
            </motion.div>

            {/* Trend */}
            {trend && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-2 flex items-center gap-1"
              >
                {trend.positive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-xs font-semibold',
                    trend.positive ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {trend.positive ? '+' : '-'}{trend.value}%
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </GlassCard>
    );
  }
);

KPIStat.displayName = 'KPIStat';
