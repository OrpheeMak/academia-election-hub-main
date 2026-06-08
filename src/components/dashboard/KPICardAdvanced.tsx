// components/Dashboard/KPICardAdvanced.tsx
// Composant KPI Card amélioré avec boutons d'interaction

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, AlertTriangle } from 'lucide-react';

interface KPICardAdvancedProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  badge?: {
    label: string;
    color: 'red' | 'yellow' | 'green' | 'blue';
  };
  trend?: {
    value: number;
    positive: boolean;
  };
}

const badgeColors = {
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
};

export const KPICardAdvanced: React.FC<KPICardAdvancedProps> = ({
  title,
  value,
  subtitle,
  icon,
  onClick,
  badge,
  trend,
}) => {
  return (
    <div
      className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && <div className="text-electoral-primary">{icon}</div>}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {badge && (
          <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeColors[badge.color]}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {trend && (
          <p className={`text-sm font-medium mt-2 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </p>
        )}
      </div>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        variant="outline"
        size="sm"
        className="w-full group-hover:bg-electoral-primary group-hover:text-white"
      >
        Voir détails
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};

/**
 * Composant pour afficher les anomalies critiques
 */
export const AnomalyBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm font-semibold text-red-800">
      <AlertTriangle className="w-4 h-4" />
      {count} anomalie{count > 1 ? 's' : ''} critique{count > 1 ? 's' : ''}
    </div>
  );
};
