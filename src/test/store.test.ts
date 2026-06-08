// src/test/store.test.ts
// Tests du store Zustand (état global)

import { describe, it, expect, beforeEach } from 'vitest';
import { useElectionStore, useFilteredResultats, useTopCandidates } from '@/store/electionStore';

describe('Election Store', () => {
  beforeEach(() => {
    // Réinitialise le store avant chaque test
    const { clearData } = useElectionStore.getState();
    clearData();
  });

  describe('Actions Simples', () => {
    it('stocke une élection', () => {
      const { setElection } = useElectionStore.getState();

      const election = {
        id: 'test-1',
        nom: 'Test Election',
        type: 'présidentielle',
        date: '2026-05-15',
      };

      setElection(election);

      const state = useElectionStore.getState();
      expect(state.election).toEqual(election);
    });

    it('ajoute un résultat et recalcule stats', () => {
      const { addResultat } = useElectionStore.getState();

      addResultat({
        id: 'result-1',
        election_id: 'elect-1',
        circonscription_id: 'circo-1',
        candidat_nom: 'Candidat A',
        candidat_id: 'cand-1',
        voix: 1000,
        taux_participation: 75,
        bureaux_depouilles: 10,
        total_bureaux: 20,
        is_anomalie: false,
        timestamp_insertion: new Date().toISOString(),
      });

      const state = useElectionStore.getState();
      expect(state.resultats.length).toBe(1);
      expect(state.totalVoix).toBe(1000);
      expect(state.participationMoyenne).toBe(75);
    });

    it('ajoute une anomalie et compte critiques', () => {
      const { addAnomalie } = useElectionStore.getState();

      addAnomalie({
        id: 'anom-1',
        resultat_id: 'result-1',
        type_anomalie: 'zscore',
        description: 'Test anomalie',
        gravite: 'critique',
        timestamp_detection: new Date().toISOString(),
      });

      const state = useElectionStore.getState();
      expect(state.anomalies.length).toBe(1);
      expect(state.anomaliesCritiques).toBe(1);
    });

    it('met à jour les filtres', () => {
      const { setFilterCirconscription, setFilterCandidat } = useElectionStore.getState();

      setFilterCirconscription('circo-1');
      setFilterCandidat('cand-2');

      const state = useElectionStore.getState();
      expect(state.filtreCirconscription).toBe('circo-1');
      expect(state.filtreCandidat).toBe('cand-2');
    });

    it('basculevue dark/light mode', () => {
      const { toggleDarkMode } = useElectionStore.getState();

      const initialState = useElectionStore.getState();
      const initialDarkMode = initialState.darkMode;

      toggleDarkMode();
      const afterToggle = useElectionStore.getState();
      expect(afterToggle.darkMode).toBe(!initialDarkMode);
    });
  });

  describe('Filtrages et Sélecteurs', () => {
    beforeEach(() => {
      const { addResultat } = useElectionStore.getState();

      // Ajoute 3 résultats de test
      addResultat({
        id: 'r1',
        election_id: 'e1',
        circonscription_id: 'c1',
        candidat_nom: 'Candidat A',
        candidat_id: 'cand-1',
        voix: 500,
        taux_participation: 70,
        bureaux_depouilles: 5,
        total_bureaux: 10,
        is_anomalie: false,
        timestamp_insertion: new Date().toISOString(),
      });

      addResultat({
        id: 'r2',
        election_id: 'e1',
        circonscription_id: 'c2',
        candidat_nom: 'Candidat B',
        candidat_id: 'cand-2',
        voix: 800,
        taux_participation: 80,
        bureaux_depouilles: 8,
        total_bureaux: 10,
        is_anomalie: true,
        timestamp_insertion: new Date().toISOString(),
      });
    });

    it('filtre par circonscription', () => {
      useElectionStore.setState({ filtreCirconscription: 'c1' });
      const filtered = useFilteredResultats();

      expect(filtered.length).toBe(1);
      expect(filtered[0].circonscription_id).toBe('c1');
    });

    it('retourne top 3 candidats', () => {
      const { addResultat } = useElectionStore.getState();

      // Ajoute plus de résultats avec candidat-1 pour le mettre en top 1
      addResultat({
        id: 'r3',
        election_id: 'e1',
        circonscription_id: 'c1',
        candidat_nom: 'Candidat A',
        candidat_id: 'cand-1',
        voix: 2000,
        taux_participation: 70,
        bureaux_depouilles: 5,
        total_bureaux: 10,
        is_anomalie: false,
        timestamp_insertion: new Date().toISOString(),
      });

      const top = useTopCandidates();

      expect(top.length).toBeGreaterThanOrEqual(1);
      expect(top[0].candidatId).toBe('cand-1');
    });
  });

  describe('Réinitialisation', () => {
    it('réinitialise tout l\'état', () => {
      const { setElection, addResultat, clearData } = useElectionStore.getState();

      setElection({
        id: 'test',
        nom: 'Test',
        type: 'présidentielle',
        date: '2026-05-15',
      });

      addResultat({
        id: 'r1',
        election_id: 'e1',
        circonscription_id: 'c1',
        candidat_nom: 'Candidat A',
        candidat_id: 'cand-1',
        voix: 500,
        taux_participation: 70,
        bureaux_depouilles: 5,
        total_bureaux: 10,
        is_anomalie: false,
        timestamp_insertion: new Date().toISOString(),
      });

      clearData();

      const state = useElectionStore.getState();
      expect(state.election).toBeNull();
      expect(state.resultats).toHaveLength(0);
      expect(state.anomalies).toHaveLength(0);
    });
  });
});
