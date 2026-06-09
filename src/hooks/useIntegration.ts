/**
 * Hook d'Intégration Complète
 * Initialise et coordonne tous les services Supabase
 */

import { useEffect, useRef, useState } from 'react';
import { supabaseOrchestrator } from '@/services/supabaseOrchestrator';
import { communicationRulesEngine } from '@/services/communicationRules';
import { votingDataGenerator } from '@/services/votingDataGenerator';

export interface IntegrationState {
  initialized: boolean;
  error: string | null;
  electionId: string | null;
  isConnected: boolean;
  stats: any;
}

/**
 * Hook principal pour l'intégration complète de Supabase
 */
export const useSupabaseIntegration = () => {
  const [state, setState] = useState<IntegrationState>({
    initialized: false,
    error: null,
    electionId: null,
    isConnected: false,
    stats: null,
  });

  const subscriptionsRef = useRef<string[]>([]);

  useEffect(() => {
    initializeSupabase();

    return () => {
      // Cleanup
      subscriptionsRef.current.forEach((subId) => {
        supabaseOrchestrator.unsubscribe(subId);
      });
      communicationRulesEngine.disconnect();
    };
  }, []);

  const initializeSupabase = async () => {
    try {
      // 1. Récupérer l'élection en cours
      const electionRes = await supabaseOrchestrator.getCurrentElection();

      if (electionRes.success && electionRes.data) {
        const electionId = electionRes.data.id;

        // 2. Connecter au système temps-réel
        communicationRulesEngine.connect();

        // 3. S'abonner aux résultats
        const resultSubId = supabaseOrchestrator.subscribeToResults(
          electionId,
          (data) => {
            console.log('Nouveau résultat:', data);
            communicationRulesEngine.emitEvent('result_received', data, electionId);
          }
        );

        // 4. S'abonner aux anomalies
        const anomalySubId = supabaseOrchestrator.subscribeToAnomalies(
          electionId,
          (data) => {
            console.log('Nouvelle anomalie:', data);
            communicationRulesEngine.emitEvent('anomaly_detected', data, electionId);
          }
        );

        subscriptionsRef.current.push(resultSubId, anomalySubId);

        // 5. Mettre en place la synchronisation
        communicationRulesEngine.setupRealtimeQueue(electionId, (event) => {
          console.log('Queue event:', event);
          updateStats();
        });

        setState({
          initialized: true,
          error: null,
          electionId,
          isConnected: true,
          stats: null,
        });

        // Charger les stats initiales
        updateStats();
      } else {
        throw new Error('Aucune élection active');
      }
    } catch (error) {
      setState({
        initialized: false,
        error: `Erreur d'initialisation: ${error}`,
        electionId: null,
        isConnected: false,
        stats: null,
      });
      console.error('Erreur d\'initialisation:', error);
    }
  };

  const updateStats = async () => {
    if (!state.electionId) return;

    try {
      const statsRes = await supabaseOrchestrator.getGlobalStats(state.electionId);
      if (statsRes.success) {
        setState((prev) => ({ ...prev, stats: statsRes.data }));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des stats:', error);
    }
  };

  const reconnect = async () => {
    communicationRulesEngine.connect();
    setState((prev) => ({ ...prev, isConnected: true }));
  };

  const disconnect = () => {
    communicationRulesEngine.disconnect();
    setState((prev) => ({ ...prev, isConnected: false }));
  };

  return {
    ...state,
    reconnect,
    disconnect,
    updateStats,
  };
};

/**
 * Hook pour gérer les anomalies
 */
export const useAnomaliesMonitoring = (electionId?: string) => {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!electionId) return;

    loadAnomalies();
    const interval = setInterval(loadAnomalies, 10000);

    return () => clearInterval(interval);
  }, [electionId]);

  const loadAnomalies = async () => {
    if (!electionId) return;

    try {
      setLoading(true);
      const res = await supabaseOrchestrator.getAnomalies(electionId, {
        limit: 50,
      });
      if (res.success) {
        setAnomalies(res.data || []);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAnomaly = async (anomalyId: string) => {
    const res = await supabaseOrchestrator.flagAnomaly(anomalyId, 'resolved');
    if (res.success) {
      loadAnomalies();
    }
  };

  const investigateAnomaly = async (anomalyId: string) => {
    const res = await supabaseOrchestrator.flagAnomaly(
      anomalyId,
      'investigating'
    );
    if (res.success) {
      loadAnomalies();
    }
  };

  const dismissAsfalse = async (anomalyId: string) => {
    const res = await supabaseOrchestrator.flagAnomaly(
      anomalyId,
      'false_positive'
    );
    if (res.success) {
      loadAnomalies();
    }
  };

  return {
    anomalies,
    loading,
    loadAnomalies,
    resolveAnomaly,
    investigateAnomaly,
    dismissAsfalse,
  };
};

/**
 * Hook pour gérer la simulation
 */
export const useSimulationManagement = () => {
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationStats, setSimulationStats] = useState<any>(null);

  const startSimulation = async (config: any) => {
    try {
      setSimulationRunning(true);
      const res = await supabaseOrchestrator.startSimulation(config);
      if (res.success) {
        console.log('Simulation started:', res.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSimulationRunning(false);
    }
  };

  const stopSimulation = () => {
    setSimulationRunning(false);
    communicationRulesEngine.disconnect();
    votingDataGenerator.reset();
  };

  const resetSimulation = () => {
    votingDataGenerator.reset();
    setSimulationStats(null);
  };

  return {
    simulationRunning,
    simulationStats,
    startSimulation,
    stopSimulation,
    resetSimulation,
  };
};

/**
 * Hook pour les statistiques en temps réel
 */
export const useRealtimeStats = (electionId?: string) => {
  const [stats, setStats] = useState<any>(null);
  const [participationTrend, setParticipationTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!electionId) return;

    loadStats();
    const interval = setInterval(loadStats, 15000);

    return () => clearInterval(interval);
  }, [electionId]);

  const loadStats = async () => {
    if (!electionId) return;

    try {
      const res = await supabaseOrchestrator.getGlobalStats(electionId);
      if (res.success) {
        setStats(res.data);

        // Simuler une tendance
        setParticipationTrend((prev) => [
          ...prev,
          {
            time: new Date().toLocaleTimeString('fr-FR'),
            participation: res.data?.participationMoyenne || 0,
            voix: res.data?.totalVoix || 0,
          },
        ].slice(-24));
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return {
    stats,
    participationTrend,
    loadStats,
  };
};

/**
 * Hook pour les communications
 */
export const useCommunicationStatus = () => {
  const [commStats, setCommStats] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCommStats(communicationRulesEngine.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return commStats;
};
