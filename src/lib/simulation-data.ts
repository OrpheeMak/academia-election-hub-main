export type CandidateResult = {
  id: string;
  name: string;
  party: string;
  color: string;
  votes: number;
};

export type ProvinceResult = {
  id: string;
  name: string;
  registered: number;
  turnout: number;
  countedOffices: number;
  totalOffices: number;
  leadingCandidate: string;
  riskScore: number;
};

export type SimulatedAnomaly = {
  id: string;
  type: 'participation' | 'coherence' | 'variation' | 'retard';
  province: string;
  severity: 'faible' | 'moyenne' | 'critique';
  score: number;
  message: string;
  recommendation: string;
};

export const candidateResults: CandidateResult[] = [
  { id: 'c1', name: 'Amina Kabasele', party: 'Alliance Civique', color: '#0f766e', votes: 1284500 },
  { id: 'c2', name: 'David Mbala', party: 'Union Nationale', color: '#2563eb', votes: 1120780 },
  { id: 'c3', name: 'Nadine Ilunga', party: 'Mouvement Social', color: '#ca8a04', votes: 842300 },
  { id: 'c4', name: 'Joseph Lemba', party: 'Coalition Populaire', color: '#dc2626', votes: 468920 },
];

export const provinceResults: ProvinceResult[] = [
  {
    id: 'kin',
    name: 'Kinshasa',
    registered: 4250000,
    turnout: 67.4,
    countedOffices: 1184,
    totalOffices: 1300,
    leadingCandidate: 'Amina Kabasele',
    riskScore: 24,
  },
  {
    id: 'kat',
    name: 'Haut-Katanga',
    registered: 1760000,
    turnout: 72.1,
    countedOffices: 704,
    totalOffices: 820,
    leadingCandidate: 'David Mbala',
    riskScore: 41,
  },
  {
    id: 'kas',
    name: 'Kasai Central',
    registered: 980000,
    turnout: 88.7,
    countedOffices: 388,
    totalOffices: 420,
    leadingCandidate: 'Amina Kabasele',
    riskScore: 76,
  },
  {
    id: 'nor',
    name: 'Nord-Kivu',
    registered: 1510000,
    turnout: 54.3,
    countedOffices: 512,
    totalOffices: 760,
    leadingCandidate: 'Nadine Ilunga',
    riskScore: 58,
  },
  {
    id: 'equ',
    name: 'Equateur',
    registered: 690000,
    turnout: 61.5,
    countedOffices: 260,
    totalOffices: 330,
    leadingCandidate: 'David Mbala',
    riskScore: 18,
  },
];

export const simulatedAnomalies: SimulatedAnomaly[] = [
  {
    id: 'a1',
    type: 'participation',
    province: 'Kasai Central',
    severity: 'critique',
    score: 94,
    message: 'Participation locale superieure au profil historique attendu.',
    recommendation: 'Verifier les proces-verbaux et les inscrits des bureaux concernes.',
  },
  {
    id: 'a2',
    type: 'coherence',
    province: 'Nord-Kivu',
    severity: 'moyenne',
    score: 67,
    message: 'Ecart entre voix exprimees et total transmis par plusieurs bureaux.',
    recommendation: 'Relancer la consolidation et comparer avec les lots sources.',
  },
  {
    id: 'a3',
    type: 'variation',
    province: 'Haut-Katanga',
    severity: 'moyenne',
    score: 61,
    message: 'Variation rapide du score d un candidat sur une courte fenetre.',
    recommendation: 'Surveiller les prochaines transmissions avant validation.',
  },
  {
    id: 'a4',
    type: 'retard',
    province: 'Kinshasa',
    severity: 'faible',
    score: 32,
    message: 'Retard de transmission dans un groupe de centres urbains.',
    recommendation: 'Maintenir le suivi operationnel.',
  },
];

export function getElectionSummary() {
  const totalVotes = candidateResults.reduce((sum, candidate) => sum + candidate.votes, 0);
  const registered = provinceResults.reduce((sum, province) => sum + province.registered, 0);
  const countedOffices = provinceResults.reduce((sum, province) => sum + province.countedOffices, 0);
  const totalOffices = provinceResults.reduce((sum, province) => sum + province.totalOffices, 0);
  const averageTurnout =
    provinceResults.reduce((sum, province) => sum + province.turnout, 0) / provinceResults.length;

  return {
    totalVotes,
    registered,
    countedOffices,
    totalOffices,
    averageTurnout,
    progress: Math.round((countedOffices / totalOffices) * 100),
  };
}
