import { supabase } from '@/config/supabase';
import {
  candidateResults,
  provinceResults,
  simulatedAnomalies,
  type CandidateResult,
  type ProvinceResult,
  type SimulatedAnomaly,
} from '@/lib/simulation-data';

export type DataSource = 'supabase' | 'fallback';

export interface ElectionRecord {
  id: string;
  nom: string;
  type: string;
  date_election: string;
  statut: string;
  description?: string | null;
}

export interface ObserverData {
  source: DataSource;
  election: ElectionRecord | null;
  candidates: CandidateResult[];
  provinces: ProvinceResult[];
}

export interface AnomalyData {
  source: DataSource;
  anomalies: SimulatedAnomaly[];
}

const colors = ['#0f766e', '#2563eb', '#ca8a04', '#dc2626', '#7c3aed', '#0891b2'];

function normalizeSeverity(value?: string | null): SimulatedAnomaly['severity'] {
  if (value === 'critique') return 'critique';
  if (value === 'moyenne' || value === 'moyen') return 'moyenne';
  return 'faible';
}

export async function getCurrentElection() {
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .order('date_election', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as ElectionRecord | null) ?? null;
}

export async function getAllElections() {
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .order('date_election', { ascending: false });

  if (error) throw error;
  return (data || []) as ElectionRecord[];
}

export async function createElection(input: {
  nom: string;
  type: string;
  date_election: string;
  statut: string;
  description?: string;
}) {
  const { data, error } = await supabase
    .from('elections')
    .insert({
      nom: input.nom,
      type: input.type,
      date_election: input.date_election,
      statut: input.statut,
      description: input.description || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as ElectionRecord;
}

export async function loadObserverData(): Promise<ObserverData> {
  try {
    const election = await getCurrentElection();
    if (!election) {
      return { source: 'fallback', election: null, candidates: candidateResults, provinces: provinceResults };
    }

    const [candidatesRes, provincesRes, resultsRes, anomaliesRes] = await Promise.all([
      supabase.from('candidats').select('*').eq('election_id', election.id),
      supabase.from('provinces').select('*').eq('election_id', election.id),
      supabase.from('resultats_partiels').select('*').eq('election_id', election.id),
      supabase.from('anomalies').select('id, province_id').eq('election_id', election.id),
    ]);

    if (candidatesRes.error) throw candidatesRes.error;
    if (provincesRes.error) throw provincesRes.error;
    if (resultsRes.error) throw resultsRes.error;
    if (anomaliesRes.error) throw anomaliesRes.error;

    const rawCandidates = candidatesRes.data || [];
    const rawProvinces = provincesRes.data || [];
    const rawResults = resultsRes.data || [];
    const rawAnomalies = anomaliesRes.data || [];

    if (rawCandidates.length === 0 && rawProvinces.length === 0 && rawResults.length === 0) {
      return { source: 'fallback', election, candidates: candidateResults, provinces: provinceResults };
    }

    const candidates: CandidateResult[] = rawCandidates.map((candidate: any, index: number) => ({
      id: candidate.id,
      name: candidate.nom,
      party: candidate.parti_politique || 'Sans parti',
      color: candidate.couleur_chart || colors[index % colors.length],
      votes: rawResults
        .filter((result: any) => result.candidat_id === candidate.id)
        .reduce((sum: number, result: any) => sum + Number(result.voix || 0), 0),
    }));

    const fallbackLeader = candidates[0]?.name || 'Non disponible';
    const provinces: ProvinceResult[] = rawProvinces.map((province: any) => {
      const provinceResultsDb = rawResults.filter((result: any) => result.province_id === province.id);
      const leadingResult = [...provinceResultsDb].sort((a: any, b: any) => Number(b.voix || 0) - Number(a.voix || 0))[0];
      const leadingCandidate = candidates.find((candidate) => candidate.id === leadingResult?.candidat_id)?.name || fallbackLeader;
      const countedOffices = Math.max(...provinceResultsDb.map((result: any) => Number(result.bureaux_depouilles || 0)), 0);
      const totalOffices = Number(province.nombre_bureaux || Math.max(countedOffices, 1));
      const turnoutValues = provinceResultsDb
        .map((result: any) => Number(result.taux_participation || 0))
        .filter((value: number) => value > 0);
      const turnout =
        turnoutValues.length > 0
          ? turnoutValues.reduce((sum: number, value: number) => sum + value, 0) / turnoutValues.length
          : 0;
      const riskScore = Math.min(
        100,
        rawAnomalies.filter((anomaly: any) => anomaly.province_id === province.id).length * 25
      );

      return {
        id: province.id,
        name: province.nom,
        registered: Number(province.nombre_inscrits || 0),
        turnout: Number(turnout.toFixed(1)),
        countedOffices,
        totalOffices,
        leadingCandidate,
        riskScore,
      };
    });

    return { source: 'supabase', election, candidates, provinces };
  } catch (error) {
    console.error('Erreur chargement donnees observateur:', error);
    return { source: 'fallback', election: null, candidates: candidateResults, provinces: provinceResults };
  }
}

export async function loadAnomalyData(): Promise<AnomalyData> {
  try {
    const election = await getCurrentElection();
    if (!election) return { source: 'fallback', anomalies: simulatedAnomalies };

    const { data, error } = await supabase
      .from('anomalies')
      .select('*, province:provinces(nom)')
      .eq('election_id', election.id)
      .order('timestamp_detection', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!data || data.length === 0) return { source: 'fallback', anomalies: simulatedAnomalies };

    return {
      source: 'supabase',
      anomalies: data.map((anomaly: any) => ({
        id: anomaly.id,
        type:
          anomaly.type === 'zscore' || anomaly.type === 'iqr'
            ? 'participation'
            : anomaly.type === 'voix_superieures_inscrits'
              ? 'coherence'
              : 'variation',
        province: anomaly.province?.nom || 'Province inconnue',
        severity: normalizeSeverity(anomaly.gravite),
        score: Math.min(100, Math.round(Number(anomaly.score || 0) * 10 || 50)),
        message: anomaly.description || anomaly.methode || 'Anomalie detectee dans la base.',
        recommendation:
          anomaly.status === 'resolved'
            ? 'Controle deja marque comme resolu.'
            : 'Verifier les donnees sources et le proces-verbal associe.',
      })),
    };
  } catch (error) {
    console.error('Erreur chargement anomalies:', error);
    return { source: 'fallback', anomalies: simulatedAnomalies };
  }
}

export async function startSimulationInDatabase(electionId: string) {
  const { data, error } = await supabase
    .from('simulation_logs')
    .insert({
      election_id: electionId,
      status: 'running',
      config: {
        started_from: 'frontend',
        timestamp: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: string };
}
