/**
 * Service d'Orchestration Supabase
 * Centralise toutes les communications Supabase et la logique métier
 * Gère: Elections, Provinces, Résultats, Anomalies, Prédictions, Simulations
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';
import {
  Election,
  Province,
  Candidat,
  ResultatPartiel,
  Anomalie,
} from '@/types/database';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SupabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface ElectionStats {
  totalVoix: number;
  participationMoyenne: number;
  anomaliesCount: number;
  provincesReportees: number;
  bureaux_actifs: number;
}

export interface ProvinceStats {
  provinceId: string;
  provinceName: string;
  voixTotal: number;
  taux_participation: number;
  anomaliesCount: number;
  top3Candidats: Array<{ nom: string; voix: number; pourcentage: number }>;
}

export interface AnomalyReport {
  id: string;
  type: string;
  severite: 'faible' | 'moyenne' | 'critique';
  description: string;
  location: { province: string; circonscription?: string };
  timestamp: Date;
  status: 'detected' | 'investigating' | 'resolved' | 'false_positive';
}

export interface VotingFlowData {
  election_id: string;
  province_id: string;
  candidat_id: string;
  voix: number;
  timestamp: Date;
  taux_participation: number;
  is_anomalie: boolean;
}

export interface SimulationConfig {
  election_id: string;
  duration_seconds: number;
  batch_interval_ms: number;
  anomaly_injection_rate: number;
  participation_range: { min: number; max: number };
}

// ============================================================================
// SERVICE ORCHESTRATION
// ============================================================================

class SupabaseOrchestrator {
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  /**
   * ÉLECTIONS - Gestion des élections
   */
  async getAllElections(): Promise<SupabaseResponse<Election[]>> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .order('date_election', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [], timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des élections: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async getElectionById(electionId: string): Promise<SupabaseResponse<Election>> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('id', electionId)
        .single();

      if (error) throw error;

      return { success: true, data, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération de l'élection: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async getCurrentElection(): Promise<SupabaseResponse<Election>> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('statut', 'en_cours')
        .order('date_election', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      return { success: true, data: data || undefined, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Pas d'élection en cours: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async createElection(election: Omit<Election, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseResponse<Election>> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .insert([
          {
            ...election,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la création de l'élection: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * PROVINCES - Gestion des provinces et circonscriptions
   */
  async getProvincesByElection(electionId: string): Promise<SupabaseResponse<Province[]>> {
    try {
      const { data, error } = await supabase
        .from('provinces')
        .select('*')
        .eq('election_id', electionId)
        .order('nom');

      if (error) throw error;

      return { success: true, data: data || [], timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des provinces: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async getProvinceStats(provinceId: string): Promise<SupabaseResponse<ProvinceStats>> {
    try {
      const [provinceRes, resultatRes, topCandidatesRes, anomaliesRes] =
        await Promise.all([
          supabase.from('provinces').select('id, nom').eq('id', provinceId).single(),
          supabase
            .from('resultats_partiels')
            .select('voix, taux_participation')
            .eq('province_id', provinceId),
          supabase
            .from('v_top_candidates_province')
            .select('*')
            .eq('province_id', provinceId)
            .limit(3),
          supabase
            .from('anomalies')
            .select('id', { count: 'exact' })
            .eq('province_id', provinceId),
        ]);

      const voixTotal =
        resultatRes.data?.reduce((sum, r) => sum + (r.voix || 0), 0) || 0;
      const taux_participation =
        resultatRes.data && resultatRes.data.length > 0
          ? Math.round(
              resultatRes.data.reduce((sum, r) => sum + (r.taux_participation || 0), 0) /
                resultatRes.data.length
            )
          : 0;

      return {
        success: true,
        data: {
          provinceId,
          provinceName: provinceRes.data?.nom || 'Unknown',
          voixTotal,
          taux_participation,
          anomaliesCount: anomaliesRes.count || 0,
          top3Candidats: topCandidatesRes.data || [],
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des stats province: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * CANDIDATS - Gestion des candidats
   */
  async getCandidatsByElection(electionId: string): Promise<SupabaseResponse<Candidat[]>> {
    try {
      const { data, error } = await supabase
        .from('candidats')
        .select('*')
        .eq('election_id', electionId)
        .order('nom');

      if (error) throw error;

      return { success: true, data: data || [], timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des candidats: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * RÉSULTATS - Gestion des résultats électoraux
   */
  async getResultatsParProvince(provinceId: string): Promise<SupabaseResponse<ResultatPartiel[]>> {
    try {
      const { data, error } = await supabase
        .from('resultats_partiels')
        .select('*')
        .eq('province_id', provinceId)
        .order('timestamp_saisie', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [], timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des résultats: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async insertResultat(resultat: VotingFlowData): Promise<SupabaseResponse<ResultatPartiel>> {
    try {
      const { data, error } = await supabase
        .from('resultats_partiels')
        .insert([
          {
            election_id: resultat.election_id,
            province_id: resultat.province_id,
            candidat_id: resultat.candidat_id,
            voix: resultat.voix,
            taux_participation: resultat.taux_participation,
            is_anomalie: resultat.is_anomalie,
            timestamp_saisie: resultat.timestamp.toISOString(),
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de l'insertion du résultat: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async getGlobalStats(electionId: string): Promise<SupabaseResponse<ElectionStats>> {
    try {
      const [resultatRes, anomaliesRes, provincesRes] = await Promise.all([
        supabase
          .from('resultats_partiels')
          .select('voix, taux_participation, province_id')
          .eq('election_id', electionId),
        supabase
          .from('anomalies')
          .select('id', { count: 'exact' })
          .eq('election_id', electionId),
        supabase
          .from('provinces')
          .select('id', { count: 'exact' })
          .eq('election_id', electionId),
      ]);

      const totalVoix = resultatRes.data?.reduce((sum, r) => sum + (r.voix || 0), 0) || 0;
      const participationMoyenne =
        resultatRes.data && resultatRes.data.length > 0
          ? Math.round(
              resultatRes.data.reduce((sum, r) => sum + (r.taux_participation || 0), 0) /
                resultatRes.data.length
            )
          : 0;

      const uniqueProvinces = new Set(resultatRes.data?.map((r) => r.province_id) || []);

      return {
        success: true,
        data: {
          totalVoix,
          participationMoyenne,
          anomaliesCount: anomaliesRes.count || 0,
          provincesReportees: uniqueProvinces.size,
          bureaux_actifs: resultatRes.data?.length || 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des stats globales: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * ANOMALIES - Détection et gestion des anomalies
   */
  async getAnomalies(
    electionId: string,
    filter?: { severite?: string; status?: string; limit?: number }
  ): Promise<SupabaseResponse<AnomalyReport[]>> {
    try {
      let query = supabase
        .from('anomalies')
        .select(
          `
          id, type, gravite, description, 
          resultat:resultats_partiels(province_id),
          province:provinces(nom),
          timestamp_detection
        `
        )
        .eq('election_id', electionId);

      if (filter?.severite) {
        query = query.eq('gravite', filter.severite);
      }

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      query = query.order('timestamp_detection', { ascending: false }).limit(filter?.limit || 50);

      const { data, error } = await query;

      if (error) throw error;

      const anomalies: AnomalyReport[] = (data || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        severite: a.gravite,
        description: a.description,
        location: {
          province: a.province?.nom || 'Unknown',
          circonscription: a.resultat?.circonscription,
        },
        timestamp: new Date(a.timestamp_detection),
        status: 'detected',
      }));

      return { success: true, data: anomalies, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la récupération des anomalies: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async flagAnomaly(
    anomalyId: string,
    status: 'investigating' | 'resolved' | 'false_positive'
  ): Promise<SupabaseResponse<void>> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .update({ status })
        .eq('id', anomalyId);

      if (error) throw error;

      return { success: true, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour de l'anomalie: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * TEMPS RÉEL - Abonnement aux mises à jour en direct
   */
  subscribeToResults(
    electionId: string,
    callback: (data: ResultatPartiel) => void
  ): string {
    const subscriptionId = `results_${electionId}_${Date.now()}`;

    const subscription = supabase
      .channel(`results_${electionId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resultats_partiels',
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          callback(payload.new as ResultatPartiel);
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  subscribeToAnomalies(
    electionId: string,
    callback: (data: Anomalie) => void
  ): string {
    const subscriptionId = `anomalies_${electionId}_${Date.now()}`;

    const subscription = supabase
      .channel(`anomalies_${electionId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anomalies',
          filter: `election_id=eq.${electionId}`,
        },
        (payload) => {
          callback(payload.new as Anomalie);
        }
      )
      .subscribe();

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  /**
   * SIMULATIONS - Gestion des simulations de votes
   */
  async startSimulation(config: SimulationConfig): Promise<SupabaseResponse<string>> {
    try {
      const { data, error } = await supabase
        .from('simulation_logs')
        .insert([
          {
            election_id: config.election_id,
            status: 'running',
            config: JSON.stringify(config),
            created_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, data: data?.id, timestamp: new Date() };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors du démarrage de la simulation: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * CLEANUP - Désabonnement et nettoyage
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }
}

export const supabaseOrchestrator = new SupabaseOrchestrator();
