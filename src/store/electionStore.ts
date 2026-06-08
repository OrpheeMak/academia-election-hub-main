// src/store/electionStore.ts
// État global pour le tableau de bord électoral (Zustand)
// Gère: résultats, anomalies, filtres, UI state

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface Resultat {
  id: string;
  election_id: string;
  circonscription_id: string;
  candidat_nom: string;
  candidat_id: string;
  voix: number;
  taux_participation: number;
  bureaux_depouilles: number;
  total_bureaux: number;
  is_anomalie: boolean;
  anomalie_type?: string;
  timestamp_insertion: string;
}

export interface Anomalie {
  id: string;
  resultat_id: string;
  type_anomalie: string;
  description: string;
  gravite: 'faible' | 'moyen' | 'critique';
  z_score?: number;
  timestamp_detection: string;
}

export interface Circonscription {
  id: string;
  nom: string;
  province: string;
  population_estimee: number;
  longitude: number;
  latitude: number;
}

export interface Election {
  id: string;
  nom: string;
  type: string;
  date: string;
}

interface ElectionStoreState {
  // Données
  election: Election | null;
  circonscriptions: Circonscription[];
  resultats: Resultat[];
  anomalies: Anomalie[];

  // Filtres
  filtreCirconscription: string | null;
  filtreCandidat: string | null;
  filtreAnomalieSeulement: boolean;

  // Statistiques en temps réel
  totalVoix: number;
  participationMoyenne: number;
  bureauxTotalDepouilles: number;
  anomaliesCritiques: number;

  // État UI
  isConnected: boolean;
  isLoading: boolean;
  darkMode: boolean;
  selectedAnomalieId: string | null;

  // Actions
  setElection: (election: Election) => void;
  setCirconscriptions: (circos: Circonscription[]) => void;
  addResultat: (resultat: Resultat) => void;
  addAnomalie: (anomalie: Anomalie) => void;
  setFilterCirconscription: (circoId: string | null) => void;
  setFilterCandidat: (candidat: string | null) => void;
  setFilterAnomalieSeulement: (value: boolean) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  toggleDarkMode: () => void;
  selectAnomalie: (anomalieId: string | null) => void;
  clearData: () => void;
}

export const useElectionStore = create<ElectionStoreState>()(
  subscribeWithSelector((set, get) => ({
    // État initial
    election: null,
    circonscriptions: [],
    resultats: [],
    anomalies: [],

    filtreCirconscription: null,
    filtreCandidat: null,
    filtreAnomalieSeulement: false,

    totalVoix: 0,
    participationMoyenne: 0,
    bureauxTotalDepouilles: 0,
    anomaliesCritiques: 0,

    isConnected: false,
    isLoading: true,
    darkMode: true,
    selectedAnomalieId: null,

    // Actions simples
    setElection: (election) => set({ election }),
    setCirconscriptions: (circonscriptions) => set({ circonscriptions }),

    setFilterCirconscription: (filtreCirconscription) => set({ filtreCirconscription }),
    setFilterCandidat: (filtreCandidat) => set({ filtreCandidat }),
    setFilterAnomalieSeulement: (filtreAnomalieSeulement) =>
      set({ filtreAnomalieSeulement }),
    setConnected: (isConnected) => set({ isConnected }),
    setLoading: (isLoading) => set({ isLoading }),
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    selectAnomalie: (selectedAnomalieId) => set({ selectedAnomalieId }),

    // Action : Ajouter un résultat (recalcule stats)
    addResultat: (resultat) =>
      set((state) => {
        const existingIndex = state.resultats.findIndex((r) => r.id === resultat.id);
        let newResultats = state.resultats;

        if (existingIndex >= 0) {
          newResultats = [...state.resultats];
          newResultats[existingIndex] = resultat;
        } else {
          newResultats = [...state.resultats, resultat];
        }

        // Recalcul stats
        const totalVoix = newResultats.reduce((sum, r) => sum + r.voix, 0);
        const participationMoyenne =
          newResultats.length > 0
            ? newResultats.reduce((sum, r) => sum + r.taux_participation, 0) /
              newResultats.length
            : 0;
        const bureauxTotalDepouilles = Math.max(
          ...newResultats.map((r) => r.bureaux_depouilles),
          0
        );

        return {
          resultats: newResultats,
          totalVoix,
          participationMoyenne: Math.round(participationMoyenne * 100) / 100,
          bureauxTotalDepouilles,
        };
      }),

    // Action : Ajouter une anomalie (met à jour count critiques)
    addAnomalie: (anomalie) =>
      set((state) => {
        const newAnomalies = [...state.anomalies, anomalie];
        const anomaliesCritiques = newAnomalies.filter(
          (a) => a.gravite === 'critique'
        ).length;

        return {
          anomalies: newAnomalies,
          anomaliesCritiques,
        };
      }),

    // Action : Réinitialise le store
    clearData: () =>
      set({
        election: null,
        circonscriptions: [],
        resultats: [],
        anomalies: [],
        filtreCirconscription: null,
        filtreCandidat: null,
        filtreAnomalieSeulement: false,
        totalVoix: 0,
        participationMoyenne: 0,
        bureauxTotalDepouilles: 0,
        anomaliesCritiques: 0,
        selectedAnomalieId: null,
      }),
  }))
);

/**
 * Sélecteur : Résultats filtrés (selon filtres actifs)
 */
export const useFilteredResultats = () => {
  const resultats = useElectionStore((state) => state.resultats);
  const anomalies = useElectionStore((state) => state.anomalies);
  const filtreCirconscription = useElectionStore((state) => state.filtreCirconscription);
  const filtreCandidat = useElectionStore((state) => state.filtreCandidat);
  const filtreAnomalieSeulement = useElectionStore((state) => state.filtreAnomalieSeulement);

  return resultats.filter((resultat) => {
    if (filtreCirconscription && resultat.circonscription_id !== filtreCirconscription) {
      return false;
    }
    if (filtreCandidat && resultat.candidat_id !== filtreCandidat) {
      return false;
    }
    if (
      filtreAnomalieSeulement &&
      !anomalies.find(
        (a) => a.resultat_id === resultat.id && a.gravite === 'critique'
      )
    ) {
      return false;
    }
    return true;
  });
};

/**
 * Sélecteur : Top 3 candidats nationaux (agrégation voix)
 */
export const useTopCandidates = () => {
  const resultats = useElectionStore((state) => state.resultats);

  const voxParCandidat = resultats.reduce(
    (acc, r) => {
      acc[r.candidat_id] = (acc[r.candidat_id] || 0) + r.voix;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(voxParCandidat)
    .map(([candidatId, voix]) => ({
      candidatId,
      voix,
    }))
    .sort((a, b) => b.voix - a.voix)
    .slice(0, 3);
};

/**
 * Sélecteur : Statistiques par circonscription
 */
export const useStatsByCirconscription = (circonscriptionId?: string) => {
  const resultats = useElectionStore((state) => state.resultats);

  const filtered = circonscriptionId
    ? resultats.filter((r) => r.circonscription_id === circonscriptionId)
    : resultats;

  return filtered.reduce(
    (acc, r) => {
      acc.totalVoix += r.voix;
      acc.participationMoyenne =
        (acc.participationMoyenne * (acc.count - 1) + r.taux_participation) / acc.count;
      acc.count += 1;
      return acc;
    },
    { totalVoix: 0, participationMoyenne: 0, count: 0 }
  );
};
