import { supabase } from "@/config/supabase";

export interface Province {
  id: string;
  nom: string;
  code: string;
  centroid_lat: number;
  centroid_lng: number;
}

export interface ProvinceParticipation {
  province_id: string;
  province: string;
  centroid_lat: number;
  centroid_lng: number;
  votants_total: number;
  inscrits_total: number;
  taux_participation: number;
}

export interface Candidat {
  id: string;
  nom: string;
  parti: string;
  election_id: string;
}

export interface ResultatAgrege {
  candidat_id: string;
  nom: string;
  parti: string;
  voix_total: number;
  pourcentage: number;
}

export interface PredictionRow {
  id: string;
  province_id: string | null;
  candidat_id: string;
  score_predit: number;
  intervalle_bas: number | null;
  intervalle_haut: number | null;
}

export interface AnomalieRow {
  id: string;
  bureau_id: string | null;
  province_id: string | null;
  type: string;
  methode: string;
  score: number;
  details: any;
  detectee_le: string;
}

export interface ParticipationBureau {
  bureau_id: string;
  votants: number;
  inscrits: number;
  taux: number;
}

export const electionApi = {
  async listProvinces(): Promise<Province[]> {
    const { data, error } = await supabase
      .from("provinces")
      .select("id, nom, code, centroid_lat, centroid_lng")
      .order("nom");
    if (error) throw error;
    return data ?? [];
  },

  async listCandidats(): Promise<Candidat[]> {
    const { data, error } = await supabase
      .from("candidats")
      .select("id, nom, parti, election_id")
      .order("nom");
    if (error) throw error;
    return data ?? [];
  },

  async participationByProvince(): Promise<ProvinceParticipation[]> {
    const { data, error } = await supabase
      .from("v_participation_province")
      .select("*");
    if (error) throw error;
    return (data ?? []) as ProvinceParticipation[];
  },

  async resultatsByCandidat(provinceId?: string | null): Promise<ResultatAgrege[]> {
    // Charger les résultats joints aux candidats et bureaux ; agréger côté client (payload reste petit)
    let query = supabase
      .from("resultats")
      .select(`
        voix,
        candidat:candidats(id, nom, parti),
        bureau:bureaux_vote(id, circonscription:circonscriptions(province_id))
      `);
    const { data, error } = await query;
    if (error) throw error;

    const map = new Map<string, ResultatAgrege>();
    let total = 0;
    for (const row of (data ?? []) as any[]) {
      const provId = row.bureau?.circonscription?.province_id;
      if (provinceId && provId !== provinceId) continue;
      const c = row.candidat;
      if (!c) continue;
      const existing = map.get(c.id) ?? {
        candidat_id: c.id,
        nom: c.nom,
        parti: c.parti,
        voix_total: 0,
        pourcentage: 0,
      };
      existing.voix_total += row.voix ?? 0;
      total += row.voix ?? 0;
      map.set(c.id, existing);
    }
    const arr = Array.from(map.values());
    arr.forEach((r) => (r.pourcentage = total ? +(r.voix_total * 100 / total).toFixed(2) : 0));
    return arr.sort((a, b) => b.voix_total - a.voix_total);
  },

  async predictions(provinceId?: string | null): Promise<(PredictionRow & { candidat?: Candidat; province?: { nom: string } })[]> {
    let q = supabase
      .from("predictions")
      .select("id, province_id, candidat_id, score_predit, intervalle_bas, intervalle_haut, candidat:candidats(id, nom, parti, election_id), province:provinces(nom)");
    if (provinceId) q = q.eq("province_id", provinceId);
    const { data, error } = await q.order("score_predit", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []) as any;
  },

  async anomalies(provinceId?: string | null): Promise<(AnomalieRow & { province?: { nom: string } })[]> {
    let q = supabase
      .from("anomalies")
      .select("id, bureau_id, province_id, type, methode, score, details, detectee_le, province:provinces(nom)")
      .order("detectee_le", { ascending: false })
      .limit(100);
    if (provinceId) q = q.eq("province_id", provinceId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as any;
  },

  async bureauParticipationSample(provinceId?: string | null): Promise<ParticipationBureau[]> {
    let q = supabase
      .from("participation")
      .select("bureau_id, votants, inscrits, taux, bureau:bureaux_vote(circonscription:circonscriptions(province_id))")
      .limit(500);
    const { data, error } = await q;
    if (error) throw error;
    return ((data ?? []) as any[])
      .filter((r) => !provinceId || r.bureau?.circonscription?.province_id === provinceId)
      .map((r) => ({ bureau_id: r.bureau_id, votants: r.votants, inscrits: r.inscrits, taux: Number(r.taux) }));
  },
};