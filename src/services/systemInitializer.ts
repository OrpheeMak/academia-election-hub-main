/**
 * Initialisation Complète du Système
 * Setup et Configuration Centralisée
 */

import { supabaseOrchestrator } from '@/services/supabaseOrchestrator';
import { communicationRulesEngine } from '@/services/communicationRules';
import { votingDataGenerator } from '@/services/votingDataGenerator';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface SystemConfig {
  election_id: string;
  auto_connect_realtime: boolean;
  enable_anomaly_detection: boolean;
  enable_simulations: boolean;
  sync_interval_ms: number;
  notification_enabled: boolean;
}

export interface InitializationResult {
  success: boolean;
  message: string;
  config?: SystemConfig;
  error?: string;
}

// ============================================================================
// INITIALIZATION SERVICE
// ============================================================================

class SystemInitializer {
  private initialized = false;
  private config: SystemConfig | null = null;
  private subscriptionIds: string[] = [];

  /**
   * Initialise tout le système
   */
  async initialize(electionId?: string): Promise<InitializationResult> {
    try {
      console.log('🚀 Démarrage de l\'initialisation du système...');

      // 1. Obtenir l'élection active
      let activeElectionId = electionId;
      if (!activeElectionId) {
        const electionRes = await supabaseOrchestrator.getCurrentElection();
        if (electionRes.success && electionRes.data) {
          activeElectionId = electionRes.data.id;
        } else {
          return {
            success: false,
            message: 'Aucune élection active trouvée',
            error: 'NO_ACTIVE_ELECTION',
          };
        }
      }

      // 2. Créer la configuration
      this.config = {
        election_id: activeElectionId,
        auto_connect_realtime: true,
        enable_anomaly_detection: true,
        enable_simulations: true,
        sync_interval_ms: 30000,
        notification_enabled: true,
      };

      // 3. Initialiser les services
      await this.initializeServices();

      // 4. Valider la connexion
      const connectionValid = await this.validateConnection();
      if (!connectionValid) {
        throw new Error('Impossible de valider la connexion a Supabase');
      }

      this.initialized = true;
      console.log('✅ Système initialisé avec succès');

      return {
        success: true,
        message: 'Système initialisé avec succès',
        config: this.config,
      };
    } catch (error) {
      console.error('❌ Erreur d\'initialisation:', error);
      return {
        success: false,
        message: `Erreur lors de l'initialisation: ${error}`,
        error: String(error),
      };
    }
  }

  /**
   * Initialise tous les services
   */
  private async initializeServices(): Promise<void> {
    if (!this.config) throw new Error('Config non disponible');

    // 1. Connecter au système temps-réel
    communicationRulesEngine.connect();
    console.log('📡 Système temps-réel connecté');

    // 2. S'abonner aux résultats
    const resultSubId = supabaseOrchestrator.subscribeToResults(
      this.config.election_id,
      (data) => {
        this.handleNewResult(data);
      }
    );
    this.subscriptionIds.push(resultSubId);

    // 3. S'abonner aux anomalies
    const anomalySubId = supabaseOrchestrator.subscribeToAnomalies(
      this.config.election_id,
      (data) => {
        this.handleNewAnomaly(data);
      }
    );
    this.subscriptionIds.push(anomalySubId);

    // 4. Configurer la queue temps-réel
    communicationRulesEngine.setupRealtimeQueue(
      this.config.election_id,
      (event) => {
        this.handleRealtimeEvent(event);
      }
    );

    console.log('🔄 Abonnements établis');
  }

  /**
   * Valide la connexion a Supabase
   */
  private async validateConnection(): Promise<boolean> {
    try {
      if (!this.config) return false;

      // Vérifier la connexion Supabase
      const { data, error } = await supabase.from('elections').select('id').limit(1);
      if (error) {
        console.error('Erreur de connexion:', error);
        return false;
      }

      // Vérifier que nous pouvons récupérer l'élection
      const electionRes = await supabaseOrchestrator.getElectionById(
        this.config.election_id
      );
      if (!electionRes.success) {
        console.error('Impossible de récupérer l\'élection');
        return false;
      }

      console.log('✅ Connexion validée');
      return true;
    } catch (error) {
      console.error('Erreur de validation:', error);
      return false;
    }
  }

  /**
   * Gère un nouveau résultat
   */
  private handleNewResult(data: any): void {
    console.log('📊 Nouveau résultat reçu:', data);

    // Émettre l'événement pour les règles de communication
    if (this.config) {
      communicationRulesEngine.emitEvent(
        'result_received',
        data,
        this.config.election_id
      );
    }
  }

  /**
   * Gère une nouvelle anomalie
   */
  private handleNewAnomaly(data: any): void {
    console.log('⚠️ Nouvelle anomalie détectée:', data);

    if (this.config && this.config.enable_anomaly_detection) {
      communicationRulesEngine.emitEvent(
        'anomaly_detected',
        data,
        this.config.election_id
      );
    }
  }

  /**
   * Gère un événement temps-réel
   */
  private handleRealtimeEvent(event: any): void {
    console.log('🔔 Événement temps-réel:', event);
  }

  /**
   * Démarre une simulation
   */
  async startSimulation(config?: any): Promise<string> {
    if (!this.initialized || !this.config) {
      throw new Error('Système non initialisé');
    }

    const simulationConfig = {
      election_id: this.config.election_id,
      duration_seconds: config?.duration_seconds || 3600,
      batch_interval_ms: config?.batch_interval_ms || 2000,
      anomaly_injection_rate: config?.anomaly_injection_rate || 0.05,
      participation_range: config?.participation_range || {
        min: 0.3,
        max: 0.9,
      },
    };

    const res = await supabaseOrchestrator.startSimulation(simulationConfig);
    if (!res.success) {
      throw new Error('Impossible de démarrer la simulation');
    }

    console.log('▶️ Simulation démarrée');
    return res.data || '';
  }

  /**
   * Arrête la simulation
   */
  stopSimulation(): void {
    communicationRulesEngine.disconnect();
    votingDataGenerator.reset();
    console.log('⏹️ Simulation arrêtée');
  }

  /**
   * Nettoie et arrête le système
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🛑 Arrêt du système...');

      // Désabonner tous les abonnements
      this.subscriptionIds.forEach((subId) => {
        supabaseOrchestrator.unsubscribe(subId);
      });
      this.subscriptionIds = [];

      // Déconnecter le système temps-réel
      communicationRulesEngine.disconnect();

      // Réinitialiser le générateur de données
      votingDataGenerator.reset();

      this.initialized = false;
      this.config = null;

      console.log('✅ Système arrêté proprement');
    } catch (error) {
      console.error('Erreur lors de l\'arrêt:', error);
    }
  }

  /**
   * Obtient l'état du système
   */
  getStatus(): {
    initialized: boolean;
    config: SystemConfig | null;
    subscriptionsCount: number;
  } {
    return {
      initialized: this.initialized,
      config: this.config,
      subscriptionsCount: this.subscriptionIds.length,
    };
  }

  /**
   * Recharge la configuration
   */
  async reloadConfiguration(): Promise<void> {
    if (!this.config) return;

    // Recharger depuis le Supabase
    const electionRes = await supabaseOrchestrator.getElectionById(
      this.config.election_id
    );

    if (electionRes.success && electionRes.data) {
      console.log('🔄 Configuration rechargée');
    }
  }
}

// Export singleton
export const systemInitializer = new SystemInitializer();

/**
 * Initialise le système au démarrage de l'app
 */
export async function initializeApplication(): Promise<void> {
  try {
    const result = await systemInitializer.initialize();

    if (result.success) {
      console.log('Application initialisée avec succès');
    } else {
      console.warn('Avertissement lors de l\'initialisation:', result.message);
    }
  } catch (error) {
    console.error('Erreur critique lors de l\'initialisation:', error);
  }
}

/**
 * Nettoie l'application à la fermeture
 */
export async function cleanupApplication(): Promise<void> {
  await systemInitializer.shutdown();
}
