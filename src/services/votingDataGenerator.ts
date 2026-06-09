/**
 * Générateur de Données de Vote Fictives
 * Crée des flux de votes réalistes avec anomalies injectées
 * Simule les patterns électoraux RDC
 */

import { VotingFlowData, SimulationConfig } from './supabaseOrchestrator';

// ============================================================================
// CONSTANTS & PATTERNS
// ============================================================================

const PARTICIPATION_PATTERNS = {
  early_morning: { min: 0.05, max: 0.15 },
  morning: { min: 0.2, max: 0.4 },
  midday: { min: 0.15, max: 0.3 },
  afternoon: { min: 0.4, max: 0.6 },
  evening: { min: 0.3, max: 0.5 },
  closing: { min: 0.1, max: 0.2 },
};

const ANOMALY_TYPES = [
  {
    name: 'participation_unusuelle',
    condition: (participation: number) => participation > 0.85 || participation < 0.05,
    severity: 'critique',
  },
  {
    name: 'concentration_votes',
    condition: (topVoteRatio: number) => topVoteRatio > 0.85,
    severity: 'critique',
  },
  {
    name: 'ecart_participation',
    condition: (diff: number) => Math.abs(diff) > 0.3,
    severity: 'moyenne',
  },
  {
    name: 'pic_votes_subit',
    condition: (delta: number) => delta > 0.5,
    severity: 'moyenne',
  },
  {
    name: 'absence_candidat',
    condition: (candidatesWithVotes: number) => candidatesWithVotes < 2,
    severity: 'faible',
  },
];

// ============================================================================
// GÉNÉRATEUR
// ============================================================================

export interface GeneratedVotingBatch {
  votes: VotingFlowData[];
  anomalies: Array<VotingFlowData & { anomaly_type: string; anomaly_severity: string }>;
  stats: {
    totalVotes: number;
    avgParticipation: number;
    anomalyCount: number;
    anomalyRate: number;
  };
}

export class VotingDataGenerator {
  private candidateVoteHistory: Map<string, number[]> = new Map();
  private provinceParticipationHistory: Map<string, number[]> = new Map();

  /**
   * Génère un lot de votes fictifs pour une élection
   */
  generateVotingBatch(
    config: SimulationConfig,
    timeIndex: number,
    provinces: string[],
    candidates: string[]
  ): GeneratedVotingBatch {
    const votes: VotingFlowData[] = [];
    const anomalies: Array<VotingFlowData & { anomaly_type: string; anomaly_severity: string }> = [];

    // Calculer la participation attendue selon l'heure du jour
    const participation = this.getExpectedParticipation(timeIndex, config.duration_seconds);

    // Générer les votes pour chaque province
    for (const province of provinces) {
      const candidateVotes = this.generateCandidateVotes(
        candidates,
        participation,
        config.participation_range
      );

      // Injecter des anomalies selon le taux configuré
      const hasAnomaly = Math.random() < config.anomaly_injection_rate;

      for (const [candidateId, voix] of Object.entries(candidateVotes)) {
        const voteData: VotingFlowData = {
          election_id: config.election_id,
          province_id: province,
          candidat_id: candidateId,
          voix: voix as number,
          timestamp: new Date(),
          taux_participation: participation,
          is_anomalie: hasAnomaly,
        };

        if (hasAnomaly) {
          // Détecter quel type d'anomalie
          const anomalyType = this.detectAnomalyType(
            voteData,
            candidateVotes,
            participation,
            this.getProvinceParticipationHistory(province)
          );

          if (anomalyType) {
            anomalies.push({
              ...voteData,
              anomaly_type: anomalyType.name,
              anomaly_severity: anomalyType.severity,
            });
          }
        }

        votes.push(voteData);
      }

      // Tracker l'historique pour détecter les anomalies
      this.recordVoteHistory(province, participation);
    }

    // Calculer les stats du lot
    const totalVotes = votes.reduce((sum, v) => sum + v.voix, 0);
    const avgParticipation =
      votes.reduce((sum, v) => sum + v.taux_participation, 0) / Math.max(votes.length, 1);

    return {
      votes,
      anomalies,
      stats: {
        totalVotes,
        avgParticipation,
        anomalyCount: anomalies.length,
        anomalyRate: anomalies.length / Math.max(votes.length, 1),
      },
    };
  }

  /**
   * Génère les votes pour les candidats d'une province
   */
  private generateCandidateVotes(
    candidates: string[],
    baseParticipation: number,
    participationRange: { min: number; max: number }
  ): Record<string, number> {
    const votes: Record<string, number> = {};
    const variation = baseParticipation * (Math.random() * 0.2 - 0.1); // ±10%
    const actualParticipation = Math.max(
      participationRange.min,
      Math.min(participationRange.max, baseParticipation + variation)
    );

    // Distribution des votes (avec légère variation)
    const totalBureaux = Math.floor(1000 + Math.random() * 500); // 1000-1500 bureaux
    const totalVotants = Math.floor(totalBureaux * (100 + Math.random() * 200) * actualParticipation);

    // Simuler une distribution réaliste des votes (quelques candidats dominants)
    const sharePercentages: number[] = [];
    let remainingShare = 100;

    for (let i = 0; i < candidates.length; i++) {
      if (i === 0) {
        // Candidat principal : 25-45%
        sharePercentages.push(Math.min(remainingShare, 25 + Math.random() * 20));
      } else if (i === 1) {
        // Deuxième candidat : 20-35%
        sharePercentages.push(Math.min(remainingShare, 20 + Math.random() * 15));
      } else if (i === 2) {
        // Troisième candidat : 15-25%
        sharePercentages.push(Math.min(remainingShare, 15 + Math.random() * 10));
      } else {
        // Autres : distribution égale du reste
        sharePercentages.push(remainingShare / (candidates.length - i));
      }
      remainingShare -= sharePercentages[i];
    }

    // Convertir en votes
    candidates.forEach((candidateId, index) => {
      const share = sharePercentages[index] / 100;
      const voix = Math.floor(totalVotants * share);
      votes[candidateId] = Math.max(1, voix); // Au minimum 1 voix
    });

    return votes;
  }

  /**
   * Obtient la participation attendue selon l'heure
   */
  private getExpectedParticipation(timeIndex: number, durationSeconds: number): number {
    const percentage = timeIndex / durationSeconds;

    if (percentage < 0.15) {
      return this.randomInRange(PARTICIPATION_PATTERNS.early_morning);
    } else if (percentage < 0.35) {
      return this.randomInRange(PARTICIPATION_PATTERNS.morning);
    } else if (percentage < 0.5) {
      return this.randomInRange(PARTICIPATION_PATTERNS.midday);
    } else if (percentage < 0.8) {
      return this.randomInRange(PARTICIPATION_PATTERNS.afternoon);
    } else if (percentage < 0.95) {
      return this.randomInRange(PARTICIPATION_PATTERNS.evening);
    } else {
      return this.randomInRange(PARTICIPATION_PATTERNS.closing);
    }
  }

  /**
   * Détecte le type d'anomalie dans les votes
   */
  private detectAnomalyType(
    vote: VotingFlowData,
    allVotes: Record<string, number>,
    participation: number,
    history: number[]
  ): { name: string; severity: string } | null {
    const totalVotes = Object.values(allVotes).reduce((a, b) => a + b, 0);
    const topVoteRatio = Math.max(...Object.values(allVotes)) / totalVotes;

    // Calcul de l'écart avec l'historique
    const avgHistorical = history.length > 0 ? history.reduce((a, b) => a + b) / history.length : participation;
    const participationDiff = Math.abs(participation - avgHistorical);

    // Vérifier chaque type d'anomalie
    for (const anomaly of ANOMALY_TYPES) {
      if (anomaly.name === 'participation_unusuelle' && anomaly.condition(participation)) {
        return { name: anomaly.name, severity: anomaly.severity };
      }
      if (anomaly.name === 'concentration_votes' && anomaly.condition(topVoteRatio)) {
        return { name: anomaly.name, severity: anomaly.severity };
      }
      if (anomaly.name === 'ecart_participation' && anomaly.condition(participationDiff)) {
        return { name: anomaly.name, severity: anomaly.severity };
      }
      if (
        anomaly.name === 'absence_candidat' &&
        anomaly.condition(Object.values(allVotes).filter((v) => v > 0).length)
      ) {
        return { name: anomaly.name, severity: anomaly.severity };
      }
    }

    return null;
  }

  /**
   * Enregistre l'historique des votes
   */
  private recordVoteHistory(provinceId: string, participation: number): void {
    if (!this.provinceParticipationHistory.has(provinceId)) {
      this.provinceParticipationHistory.set(provinceId, []);
    }

    const history = this.provinceParticipationHistory.get(provinceId)!;
    history.push(participation);

    // Garder seulement les 50 derniers enregistrements
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Récupère l'historique de participation d'une province
   */
  private getProvinceParticipationHistory(provinceId: string): number[] {
    return this.provinceParticipationHistory.get(provinceId) || [];
  }

  /**
   * Utilitaire: génère un nombre aléatoire dans une plage
   */
  private randomInRange(range: { min: number; max: number }): number {
    return range.min + Math.random() * (range.max - range.min);
  }

  /**
   * Réinitialise l'historique
   */
  reset(): void {
    this.candidateVoteHistory.clear();
    this.provinceParticipationHistory.clear();
  }
}

export const votingDataGenerator = new VotingDataGenerator();
