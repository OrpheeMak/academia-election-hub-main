// scripts/simulate-realtime.ts
// EXÉCUTABLE : tsx scripts/simulate-realtime.ts
// Injecte des données électorales simulées en temps réel dans Supabase
// Détecte anomalies côté backend avant stockage

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runFullAnomalyDetection } from './anomaly-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

interface Dataset {
  election: { nom: string; type: string; date: string };
  circonscriptions: Array<{
    id: string;
    nom: string;
    province: string;
    total_bureaux: number;
  }>;
  candidats: Array<{ id: string; nom: string; parti: string; colour: string }>;
  simulation_config: {
    duration_seconds: number;
    batch_interval_ms: number;
    bureaux_progression_per_batch: { min: number; max: number };
    participation_rate_range: { min: number; max: number };
    anomaly_injection_rate: number;
  };
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables manquantes : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY');
  console.error('Définir dans .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// CHARGEMENT DATASET
// ============================================================================

function loadDataset(): Dataset {
  const datasetPath = path.join(__dirname, 'dataset-rdc.json');
  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  return JSON.parse(rawData);
}

// ============================================================================
// LOGIQUE DE SIMULATION
// ============================================================================

class ElectionSimulator {
  private dataset: Dataset;
  private circonscriptionStates: Map<
    string,
    {
      totalVoixParCandidat: Map<string, number[]>;
      totalParticipation: number[];
      bureauxtotal: number;
      inscrits: number;
    }
  > = new Map();
  private electionId: string = '';
  private isRunning: boolean = true;
  private insertedCount: number = 0;
  private anomalyCount: number = 0;

  constructor() {
    this.dataset = loadDataset();
    this.initializeCirconscriptionStates();
  }

  private initializeCirconscriptionStates() {
    for (const circo of this.dataset.circonscriptions) {
      this.circonscriptionStates.set(circo.id, {
        totalVoixParCandidat: new Map(
          this.dataset.candidats.map((c) => [c.id, []])
        ),
        totalParticipation: [],
        bureauxtotal: 0,
        inscrits: Math.floor(circo.population_estimee * 0.65), // ~65% d'inscrits
      });
    }
  }

  /**
   * Récupère l'election_id depuis Supabase
   */
  private async fetchOrCreateElection(): Promise<string> {
    try {
      const { data: existing } = await supabase
        .from('elections')
        .select('id')
        .eq('nom', this.dataset.election.nom)
        .limit(1)
        .single();

      if (existing) {
        console.log('✅ Élection trouvée :', existing.id);
        return existing.id;
      }
    } catch (err) {
      // Pas trouvée, on crée
    }

    const { data: created, error } = await supabase
      .from('elections')
      .insert({
        nom: this.dataset.election.nom,
        type: this.dataset.election.type,
        date: this.dataset.election.date,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Erreur création élection: ${error.message}`);
    console.log('✅ Élection créée :', created.id);
    return created.id;
  }

  /**
   * Récupère les circonscriptions depuis Supabase
   */
  private async getCirconscriptions(): Promise<
    Array<{ id: string; nom: string; total_bureaux: number }>
  > {
    const { data, error } = await supabase
      .from('circonscriptions')
      .select('id, nom, total_bureaux')
      .eq('election_id', this.electionId);

    if (error) throw new Error(`Erreur récupération circonscriptions: ${error.message}`);
    return data || [];
  }

  /**
   * Génère les données pour un batch (2-3 secondes)
   */
  private generateBatchData(
    circonscription: { id: string; total_bureaux: number },
    state: (typeof this.circonscriptionStates)[string]
  ): Array<{
    election_id: string;
    circonscription_id: string;
    candidat_nom: string;
    candidat_id: string;
    voix: number;
    taux_participation: number;
    bureaux_depouilles: number;
    total_bureaux: number;
    is_anomalie: boolean;
    anomalie_type: string | null;
  }> {
    const config = this.dataset.simulation_config;
    const progression = Math.floor(
      Math.random() *
        (config.bureaux_progression_per_batch.max -
          config.bureaux_progression_per_batch.min +
          1) +
        config.bureaux_progression_per_batch.min
    );

    state.bureauxtotal = Math.min(state.bureauxtotal + progression, circonscription.total_bureaux);

    const participation =
      Math.random() *
        (config.participation_rate_range.max - config.participation_rate_range.min) +
      config.participation_rate_range.min;

    state.totalParticipation.push(participation);

    return this.dataset.candidats.map((candidat) => {
      // Génère voix avec distribution normale
      const baseVoix = Math.floor(
        (state.inscrits * (participation / 100) * state.bureauxtotal) /
          circonscription.total_bureaux /
          this.dataset.candidats.length
      );
      const variance = Math.floor(Math.random() * (baseVoix * 0.3));
      const voix = Math.max(0, baseVoix + variance - Math.random() * variance);

      state.totalVoixParCandidat.get(candidat.id)!.push(voix);

      // Détection d'anomalies
      const anomalyResult = runFullAnomalyDetection({
        participation,
        voix,
        inscrits: state.inscrits,
        precedentVoix: state.totalVoixParCandidat
          .get(candidat.id)!
          .at(-2), // Pénultième valeur
        participationHistorique: state.totalParticipation.slice(-20),
        voixHistorique: state.totalVoixParCandidat
          .get(candidat.id)!
          .slice(-20),
      });

      // Injection aléatoire d'anomalies (contrôlée)
      let isAnomaly = anomalyResult.is_anomalous;
      if (
        !isAnomaly &&
        Math.random() < config.anomaly_injection_rate
      ) {
        isAnomaly = true;
      }

      return {
        election_id: this.electionId,
        circonscription_id: circonscription.id,
        candidat_nom: candidat.nom,
        candidat_id: candidat.id,
        voix: Math.floor(voix),
        taux_participation: Math.min(100, participation),
        bureaux_depouilles: state.bureauxtotal,
        total_bureaux: circonscription.total_bureaux,
        is_anomalie: isAnomaly,
        anomalie_type: isAnomaly ? anomalyResult.anomaly_type || 'unknown' : null,
      };
    });
  }

  /**
   * Insère un batch dans Supabase + détecte anomalies
   */
  private async insertBatch(
    batchData: Array<{
      election_id: string;
      circonscription_id: string;
      candidat_nom: string;
      candidat_id: string;
      voix: number;
      taux_participation: number;
      bureaux_depouilles: number;
      total_bureaux: number;
      is_anomalie: boolean;
      anomalie_type: string | null;
    }>
  ) {
    try {
      // Insertion resultats_partiels
      const { data: inserted, error: insertError } = await supabase
        .from('resultats_partiels')
        .insert(batchData)
        .select('id, is_anomalie, anomalie_type');

      if (insertError) throw insertError;

      // Détecte anomalies et insère dans la table anomalies
      for (let i = 0; i < batchData.length; i++) {
        if (batchData[i].is_anomalie && inserted?.[i]) {
          const resultatId = inserted[i].id;
          const anomalyType = inserted[i].anomalie_type || batchData[i].anomalie_type;

          const { error: anomalyError } = await supabase
            .from('anomalies')
            .insert({
              resultat_id: resultatId,
              resultat_partial_data: batchData[i],
              type_anomalie: anomalyType,
              description: `Anomalie détectée : ${anomalyType} - Candidat ${batchData[i].candidat_nom} en ${batchData[i].circonscription_id}`,
              gravite: batchData[i].taux_participation > 95 ? 'critique' : 'moyen',
              z_score:
                Math.abs(batchData[i].taux_participation - 60) / 15, // Z approché
            });

          if (!anomalyError) {
            this.anomalyCount++;
          }
        }
      }

      this.insertedCount += batchData.length;
      console.log(
        `✅ Batch inséré: ${batchData.length} résultats | Anomalies détectées: ${this.anomalyCount}`
      );
    } catch (error) {
      console.error('❌ Erreur insertion batch:', error);
    }
  }

  /**
   * Boucle principale de simulation
   */
  async run() {
    console.log('🚀 Démarrage simulation électorale RDC...\n');

    // Récupère/crée l'élection
    this.electionId = await this.fetchOrCreateElection();

    // Récupère les circonscriptions
    const circonscriptions = await this.getCirconscriptions();
    if (circonscriptions.length === 0) {
      console.error('❌ Aucune circonscription trouvée. Vérifier Supabase.');
      process.exit(1);
    }

    console.log(`📍 ${circonscriptions.length} circonscriptions chargées\n`);

    const config = this.dataset.simulation_config;
    const startTime = Date.now();
    const endTime = startTime + config.duration_seconds * 1000;
    let batchCount = 0;

    // Boucle de simulation
    while (this.isRunning && Date.now() < endTime) {
      for (const circo of circonscriptions) {
        const state = this.circonscriptionStates.get(circo.id)!;
        const batchData = this.generateBatchData(circo, state);
        await this.insertBatch(batchData);
      }

      batchCount++;
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = (elapsed / config.duration_seconds) * 100;

      console.log(
        `⏳ Batch ${batchCount} | ${elapsed.toFixed(1)}s / ${config.duration_seconds}s (${progress.toFixed(1)}%)`
      );

      // Attend avant prochain batch
      await new Promise((resolve) => setTimeout(resolve, config.batch_interval_ms));
    }

    // Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('📊 SIMULATION TERMINÉE');
    console.log('='.repeat(60));
    console.log(`✅ Total insertions: ${this.insertedCount}`);
    console.log(`⚠️ Anomalies détectées: ${this.anomalyCount}`);
    console.log(`⏱️ Durée: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  }

  /**
   * Arrêt gracieux (Ctrl+C)
   */
  stop() {
    this.isRunning = false;
    console.log('\n⛔ Arrêt de la simulation...');
  }
}

// ============================================================================
// EXÉCUTION
// ============================================================================

const simulator = new ElectionSimulator();

// Gestion Ctrl+C
process.on('SIGINT', () => {
  simulator.stop();
});

simulator.run().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
