// components/Dashboard/HeaderAdvanced.tsx
// Header amélioré avec nouveaux boutons (rafraîchir, notifications, aide, mode temps réel, etc.)

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  RefreshCw,
  Bell,
  HelpCircle,
  Download,
  Radio,
  AlertCircle,
} from 'lucide-react';
import { useAnomaliesNonLuesCount } from '@/hooks/useAnomalies';

interface HeaderAdvancedProps {
  onRefresh?: () => void;
  onRealtimeToggle?: (enabled: boolean) => void;
  onDownloadReport?: () => void;
  onHelpClick?: () => void;
  isRefreshing?: boolean;
  isRealtimeEnabled?: boolean;
}

export const HeaderAdvanced: React.FC<HeaderAdvancedProps> = ({
  onRefresh,
  onRealtimeToggle,
  onDownloadReport,
  onHelpClick,
  isRefreshing = false,
  isRealtimeEnabled = false,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const anomaliesCount = useAnomaliesNonLuesCount();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card shadow-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Logo et titre */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-electoral-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-foreground leading-tight">
                Tableau Électoral RDC
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Prototype académique — données simulées
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bouton Mode Temps Réel */}
            <Button
              onClick={() => onRealtimeToggle?.(!isRealtimeEnabled)}
              variant={isRealtimeEnabled ? 'default' : 'outline'}
              size="sm"
              className={isRealtimeEnabled ? 'bg-green-600 hover:bg-green-700' : ''}
              title="Activer/Désactiver le mode temps réel"
            >
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">
                {isRealtimeEnabled ? 'Temps réel ON' : 'Temps réel OFF'}
              </span>
            </Button>

            {/* Bouton Rafraîchir */}
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Rafraîchir</span>
            </Button>

            {/* Bouton Alertes */}
            <div className="relative">
              <Button
                onClick={() => setShowNotifications(!showNotifications)}
                variant="outline"
                size="sm"
                title="Afficher les alertes"
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {(anomaliesCount.data || 0) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {anomaliesCount.data}
                  </span>
                )}
              </Button>

              {/* Dropdown Notifications */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-border p-4 z-10">
                  <h4 className="font-semibold mb-3 text-foreground">Alertes récentes</h4>
                  {(anomaliesCount.data || 0) > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {/* Placeholder pour les alertes */}
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        {anomaliesCount.data} anomalie(s) critique(s) détectée(s)
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune alerte</p>
                  )}
                </div>
              )}
            </div>

            {/* Bouton Télécharger Rapport */}
            <Button
              onClick={onDownloadReport}
              variant="outline"
              size="sm"
              title="Télécharger le rapport"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Rapport</span>
            </Button>

            {/* Bouton Aide */}
            <Button
              onClick={onHelpClick}
              variant="outline"
              size="sm"
              title="Aide et documentation"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Aide</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
