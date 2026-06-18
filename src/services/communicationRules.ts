/**
 * Gestionnaire de Communication Temps-Réel
 * Définit les règles et protocoles de synchronisation
 * Gère: WebSockets, Broadcasting, Notifications Push
 */

import { supabase } from '@/config/supabase';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CommunicationRule {
  id: string;
  event: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  frequency: 'immediate' | 'batched' | 'throttled';
  throttleMs?: number;
  batchSize?: number;
  conditions?: (data: any) => boolean;
  action: (data: any) => Promise<void>;
}

export interface RealTimeEvent {
  id: string;
  type: 'result' | 'anomaly' | 'alert' | 'notification' | 'sync';
  priority: string;
  timestamp: Date;
  data: any;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface SyncState {
  election_id: string;
  last_sync: Date;
  pending_events: number;
  queue_size: number;
  connection_status: 'connected' | 'disconnected' | 'reconnecting';
}

// ============================================================================
// COMMUNICATION RULES ENGINE
// ============================================================================

class CommunicationRulesEngine {
  private rules: Map<string, CommunicationRule[]> = new Map();
  private eventQueue: RealTimeEvent[] = [];
  private batchQueues: Map<string, any[]> = new Map();
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
  private syncStates: Map<string, SyncState> = new Map();
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialise les règles de communication par défaut
   */
  private initializeDefaultRules(): void {
    // Résultats : Immédiat pour anomalies, par lot pour résultats normaux
    this.addRule({
      id: 'results_anomaly',
      event: 'result_received',
      priority: 'critical',
      frequency: 'immediate',
      conditions: (data) => data.is_anomalie === true,
      action: this.handleAnomalyAlert.bind(this),
    });

    this.addRule({
      id: 'results_normal',
      event: 'result_received',
      priority: 'medium',
      frequency: 'batched',
      batchSize: 10,
      conditions: (data) => data.is_anomalie === false,
      action: this.handleResultsBatch.bind(this),
    });

    // Anomalies : Critique, immédiat
    this.addRule({
      id: 'anomaly_detection',
      event: 'anomaly_detected',
      priority: 'critical',
      frequency: 'immediate',
      action: this.broadcastAnomaly.bind(this),
    });

    // Mises à jour de participation : Throttled toutes les 5 secondes
    this.addRule({
      id: 'participation_update',
      event: 'participation_changed',
      priority: 'high',
      frequency: 'throttled',
      throttleMs: 5000,
      action: this.broadcastParticipation.bind(this),
    });

    // Synchronisation : Toutes les 30 secondes ou à la demande
    this.addRule({
      id: 'sync_state',
      event: 'sync_requested',
      priority: 'medium',
      frequency: 'throttled',
      throttleMs: 30000,
      action: this.syncDashboardState.bind(this),
    });

    // Alertes critiques : Immédiat avec retry
    this.addRule({
      id: 'critical_alert',
      event: 'critical_issue',
      priority: 'critical',
      frequency: 'immediate',
      action: this.sendCriticalAlert.bind(this),
    });
  }

  /**
   * Ajoute une règle de communication personnalisée
   */
  addRule(rule: CommunicationRule): void {
    if (!this.rules.has(rule.event)) {
      this.rules.set(rule.event, []);
    }
    this.rules.get(rule.event)!.push(rule);

    // Trier par priorité
    const rulesForEvent = this.rules.get(rule.event)!;
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    rulesForEvent.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Émet un événement et exécute les règles appropriées
   */
  async emitEvent(event: string, data: any, electionId: string): Promise<void> {
    const eventRecord: RealTimeEvent = {
      id: `${Date.now()}_${Math.random()}`,
      type: 'notification',
      priority: 'medium',
      timestamp: new Date(),
      data,
      status: 'pending',
    };

    const rules = this.rules.get(event) || [];

    for (const rule of rules) {
      // Vérifier les conditions si présentes
      if (rule.conditions && !rule.conditions(data)) {
        continue;
      }

      try {
        if (rule.frequency === 'immediate') {
          await this.executeRule(rule, eventRecord, electionId);
        } else if (rule.frequency === 'batched') {
          this.queueForBatch(rule.id, data);
        } else if (rule.frequency === 'throttled') {
          this.throttleRule(rule, eventRecord, electionId);
        }
      } catch (error) {
        console.error(`Erreur dans la règle ${rule.id}:`, error);
        eventRecord.status = 'failed';
      }
    }

    this.eventQueue.push(eventRecord);
  }

  /**
   * Exécute une règle immédiatement
   */
  private async executeRule(
    rule: CommunicationRule,
    event: RealTimeEvent,
    electionId: string
  ): Promise<void> {
    await rule.action(event.data);
    event.status = 'delivered';
  }

  /**
   * Met en lot les événements pour traitement par batch
   */
  private queueForBatch(ruleId: string, data: any): void {
    if (!this.batchQueues.has(ruleId)) {
      this.batchQueues.set(ruleId, []);
    }

    const queue = this.batchQueues.get(ruleId)!;
    queue.push(data);

    // Obtenir la règle pour la taille de lot
    let batchSize = 10;
    for (const rules of this.rules.values()) {
      const rule = rules.find((r) => r.id === ruleId);
      if (rule?.batchSize) {
        batchSize = rule.batchSize;
      }
    }

    // Traiter si le lot est plein
    if (queue.length >= batchSize) {
      this.processBatch(ruleId);
    }
  }

  /**
   * Traite un lot d'événements
   */
  private async processBatch(ruleId: string): Promise<void> {
    const queue = this.batchQueues.get(ruleId);
    if (!queue || queue.length === 0) return;

    const batch = queue.splice(0, queue.length);

    for (const rules of this.rules.values()) {
      const rule = rules.find((r) => r.id === ruleId);
      if (rule) {
        try {
          await rule.action(batch);
        } catch (error) {
          console.error(`Erreur lors du traitement du lot ${ruleId}:`, error);
        }
      }
    }
  }

  /**
   * Applique un throttle à une règle
   */
  private throttleRule(rule: CommunicationRule, event: RealTimeEvent, electionId: string): void {
    if (this.throttleTimers.has(rule.id)) {
      return; // Déjà en attente
    }

    // Exécuter immédiatement
    rule.action(event.data).catch((error) => {
      console.error(`Erreur dans la règle throttlée ${rule.id}:`, error);
    });

    // Planifier la prochaine exécution
    const timer = setTimeout(() => {
      this.throttleTimers.delete(rule.id);
    }, rule.throttleMs || 5000);

    this.throttleTimers.set(rule.id, timer);
  }

  // =========================================================================
  // ACTIONS DE COMMUNICATION
  // =========================================================================

  /**
   * Gère les alertes d'anomalies
   */
  private async handleAnomalyAlert(data: any): Promise<void> {
    console.log('🚨 ANOMALIE DÉTECTÉE:', data);

    // Notifier les administrateurs
    await this.sendNotification({
      title: '⚠️ Anomalie Électorale Détectée',
      message: `Type: ${data.anomaly_type} | Province: ${data.province_id}`,
      priority: 'critical',
      icon: 'alert-triangle',
    });

    // Broadcast en temps réel
    await this.broadcastToClients('anomaly', data);
  }

  /**
   * Traite les résultats par lot
   */
  private async handleResultsBatch(batch: any[]): Promise<void> {
    console.log(`📊 Traitement d'un lot de ${batch.length} résultats`);

    // Agréger et updater le dashboard
    const aggregated = {
      count: batch.length,
      total_voix: batch.reduce((sum, b) => sum + (b.voix || 0), 0),
      avg_participation: batch.reduce((sum, b) => sum + (b.taux_participation || 0), 0) / batch.length,
      timestamp: new Date(),
    };

    await this.broadcastToClients('results_batch', aggregated);
  }

  /**
   * Broadcast une anomalie à tous les clients connectés
   */
  private async broadcastAnomaly(anomaly: any): Promise<void> {
    console.log('📡 Broadcasting anomalie:', anomaly);

    // Utiliser le système de Realtime Broadcast de Supabase
    const channel = supabase.channel(`anomalies:${anomaly.election_id}`);

    await channel.send({
      type: 'broadcast',
      event: 'anomaly_alert',
      payload: {
        ...anomaly,
        broadcasted_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Broadcast les mises à jour de participation
   */
  private async broadcastParticipation(data: any): Promise<void> {
    console.log('📡 Broadcasting participation update');

    const channel = supabase.channel(`election:${data.election_id}`);

    await channel.send({
      type: 'broadcast',
      event: 'participation_update',
      payload: data,
    });
  }

  /**
   * Synchronise l'état du dashboard
   */
  private async syncDashboardState(data: any): Promise<void> {
    console.log('🔄 Synchronisation de l\'état du dashboard');

    const state: SyncState = {
      election_id: data.election_id,
      last_sync: new Date(),
      pending_events: this.eventQueue.filter((e) => e.status === 'pending').length,
      queue_size: this.eventQueue.length,
      connection_status: this.connectionStatus,
    };

    this.syncStates.set(data.election_id, state);

    const channel = supabase.channel(`sync:${data.election_id}`);

    await channel.send({
      type: 'broadcast',
      event: 'state_sync',
      payload: state,
    });
  }

  /**
   * Envoie une notification push
   */
  private async sendNotification(notification: {
    title: string;
    message: string;
    priority: string;
    icon: string;
  }): Promise<void> {
    console.log('🔔 Notification:', notification);

    // Implémenter avec un service de notifications (Firebase Cloud Messaging, etc.)
    // Pour maintenant, on log juste
    if ('Notification' in window) {
      new Notification(notification.title, {
        body: notification.message,
        icon: `/icons/${notification.icon}.svg`,
        tag: 'election-alert',
      });
    }
  }

  /**
   * Envoie une alerte critique
   */
  private async sendCriticalAlert(data: any): Promise<void> {
    console.error('🚨 ALERTE CRITIQUE:', data);

    // Retry avec backoff exponentiel
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.sendNotification({
          title: '🚨 ALERTE CRITIQUE ÉLECTORALE',
          message: data.message,
          priority: 'critical',
          icon: 'alert-octagon',
        });
        break;
      } catch (error) {
        attempt++;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  }

  /**
   * Broadcast un événement à tous les clients
   */
  private async broadcastToClients(event: string, data: any): Promise<void> {
    console.log(`📡 Broadcasting ${event} à tous les clients`);

    const channel = supabase.channel('global_broadcast');

    await channel.send({
      type: 'broadcast',
      event,
      payload: data,
    });
  }

  /**
   * Obtient les statistiques de communication
   */
  getStats(): {
    totalEvents: number;
    pendingEvents: number;
    failedEvents: number;
    queueSize: number;
    connectionStatus: string;
  } {
    const totalEvents = this.eventQueue.length;
    const pendingEvents = this.eventQueue.filter((e) => e.status === 'pending').length;
    const failedEvents = this.eventQueue.filter((e) => e.status === 'failed').length;
    const queueSize = Object.values(this.batchQueues).reduce((sum, q) => sum + q.length, 0);

    return {
      totalEvents,
      pendingEvents,
      failedEvents,
      queueSize,
      connectionStatus: this.connectionStatus,
    };
  }

  /**
   * Connecte à la session temps-réel
   */
  connect(): void {
    this.connectionStatus = 'connected';
    console.log('✅ Connexion temps-réel établie');
  }

  /**
   * Déconnecte de la session temps-réel
   */
  disconnect(): void {
    this.connectionStatus = 'disconnected';
    this.throttleTimers.forEach((timer) => clearTimeout(timer));
    this.throttleTimers.clear();
    console.log('❌ Déconnexion temps-réel');
  }

  /**
   * Crée une liste d'attente de temps-réel
   */
  setupRealtimeQueue(electionId: string, onMessage: (event: RealTimeEvent) => void): void {
    const channel = supabase
      .channel(`election:${electionId}:queue`)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const event: RealTimeEvent = {
          id: `${Date.now()}_${Math.random()}`,
          type: payload.eventType as any,
          priority: (payload.new as any)?.gravite || 'medium',
          timestamp: new Date(),
          data: payload.new || payload.old,
          status: 'delivered',
        };

        onMessage(event);
      })
      .subscribe();
  }
}

export const communicationRulesEngine = new CommunicationRulesEngine();
