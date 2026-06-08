// services/api.ts
// Service API pour interagir avec Supabase

import { supabase } from '@/config/supabase';
import {
  Province,
  Candidat,
  ResultatPartiel,
  Anomalie,
  Alerte,
  Election,
} from '@/types/database';

/**
 * SERVICE ÉLECTIONS
 */
export const electionService = {
  // Récupérer toutes les élections
  getAllElections: async () => {
    const { data, error } = await supabase.from('elections').select('*');
    if (error) throw error;
    return data as Election[];
  },

  // Récupérer une élection par ID
  getElectionById: async (id: string) => {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Election;
  },

  // Récupérer l'élection en cours
  getCurrentElection: async () => {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('statut', 'en_cours')
      .single();
    if (error) throw error;
    return data as Election;
  },
};

/**
 * SERVICE PROVINCES
 */
export const provinceService = {
  // Récupérer toutes les provinces
  getAllProvinces: async (electionId?: string) => {
    let query = supabase.from('provinces').select('*');
    if (electionId) {
      query = query.eq('election_id', electionId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Province[];
  },

  // Récupérer une province par code
  getProvinceByCode: async (code: string) => {
    const { data, error } = await supabase
      .from('provinces')
      .select('*')
      .eq('code', code)
      .single();
    if (error) throw error;
    return data as Province;
  },

  // Récupérer les stats d'une province
  getProvinceStats: async (provinceId: string) => {
    const [resultats, anomalies] = await Promise.all([
      supabase
        .from('resultats_partiels')
        .select('voix, taux_participation')
        .eq('province_id', provinceId),
      supabase
        .from('anomalies')
        .select('*', { count: 'exact', head: true })
        .eq('province_id', provinceId),
    ]);

    const totalVoix =
      resultats.data?.reduce((sum, r) => sum + r.voix, 0) || 0;
    const avgParticipation =
      resultats.data?.reduce((sum, r) => sum + (r.taux_participation || 0), 0) /
        (resultats.data?.length || 1) || 0;

    return {
      totalVoix,
      avgParticipation: Math.round(avgParticipation),
      anomaliesCount: anomalies.count || 0,
    };
  },
};

/**
 * SERVICE CANDIDATS
 */
export const candidatService = {
  // Récupérer tous les candidats
  getAllCandidats: async (electionId?: string) => {
    let query = supabase.from('candidats').select('*');
    if (electionId) {
      query = query.eq('election_id', electionId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Candidat[];
  },

  // Récupérer les résultats d'un candidat
  getCandidatResults: async (candidatId: string) => {
    const { data, error } = await supabase
      .from('resultats_partiels')
      .select(`
        *,
        province:provinces(nom, code)
      `)
      .eq('candidat_id', candidatId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },
};

/**
 * SERVICE RÉSULTATS
 */
export const resultatService = {
  // Récupérer les résultats par province
  getResultatsByProvince: async (provinceId: string) => {
    const { data, error } = await supabase
      .from('resultats_partiels')
      .select(`
        *,
        candidat:candidats(nom, parti_politique, couleur_chart)
      `)
      .eq('province_id', provinceId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer les résultats récents
  getRecentResultats: async (limite: number = 100) => {
    const { data, error } = await supabase
      .from('resultats_partiels')
      .select(`
        *,
        province:provinces(nom, code),
        candidat:candidats(nom, couleur_chart)
      `)
      .order('timestamp', { ascending: false })
      .limit(limite);

    if (error) throw error;
    return data;
  },

  // Créer un nouveau résultat
  createResultat: async (resultat: Omit<ResultatPartiel, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('resultats_partiels')
      .insert([resultat])
      .select();

    if (error) throw error;
    return data?.[0];
  },
};

/**
 * SERVICE ANOMALIES
 */
export const anomalieService = {
  // Récupérer les anomalies avec filtres
  getAnomalies: async (filters?: {
    gravite?: 'faible' | 'moyenne' | 'critique';
    est_lue?: boolean;
    limite?: number;
  }) => {
    let query = supabase
      .from('anomalies')
      .select(`
        *,
        province:provinces(nom, code),
        resultat:resultats_partiels(id, voix)
      `)
      .order('timestamp_detection', { ascending: false });

    if (filters?.gravite) {
      query = query.eq('gravite', filters.gravite);
    }
    if (filters?.est_lue !== undefined) {
      query = query.eq('est_lue', filters.est_lue);
    }
    if (filters?.limite) {
      query = query.limit(filters.limite);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Anomalie[];
  },

  // Récupérer les anomalies critiques
  getAnomaliesCritiques: async () => {
    return anomalieService.getAnomalies({
      gravite: 'critique',
      est_lue: false,
    });
  },

  // Marquer une anomalie comme lue
  markAnomalieAsRead: async (anomalieId: string) => {
    const { data, error } = await supabase
      .from('anomalies')
      .update({ est_lue: true })
      .eq('id', anomalieId);

    if (error) throw error;
    return data;
  },

  // Créer une nouvelle anomalie
  createAnomalie: async (anomalie: Omit<Anomalie, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('anomalies')
      .insert([anomalie])
      .select();

    if (error) throw error;
    return data?.[0];
  },
};

/**
 * SERVICE ALERTES
 */
export const alerteService = {
  // Récupérer les alertes récentes
  getAlertes: async (limite: number = 20) => {
    const { data, error } = await supabase
      .from('alertes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) throw error;
    return data as Alerte[];
  },

  // Récupérer les alertes non lues
  getAlertesNonLues: async () => {
    const { data, error } = await supabase
      .from('alertes')
      .select('*')
      .eq('est_lue', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Alerte[];
  },

  // Marquer une alerte comme lue
  markAlerteAsRead: async (alerteId: string) => {
    const { data, error } = await supabase
      .from('alertes')
      .update({ est_lue: true })
      .eq('id', alerteId);

    if (error) throw error;
    return data;
  },

  // Compter les alertes non lues
  countAlerteNonLues: async () => {
    const { count, error } = await supabase
      .from('alertes')
      .select('*', { count: 'exact', head: true })
      .eq('est_lue', false);

    if (error) throw error;
    return count || 0;
  },
};

/**
 * SERVICE STATISTIQUES GLOBALES
 */
export const statsService = {
  // Récupérer les stats globales
  getGlobalStats: async () => {
    const [resultats, anomalies, provinces] = await Promise.all([
      supabase.from('resultats_partiels').select('voix, taux_participation'),
      supabase.from('anomalies').select('gravite', { count: 'exact', head: true }),
      supabase.from('provinces').select('*', { count: 'exact', head: true }),
    ]);

    const totalVoix = resultats.data?.reduce((sum, r) => sum + r.voix, 0) || 0;
    const avgParticipation =
      resultats.data?.reduce((sum, r) => sum + (r.taux_participation || 0), 0) /
        (resultats.data?.length || 1) || 0;

    return {
      totalVoix,
      avgParticipation: Math.round(avgParticipation),
      provincesCount: provinces.count || 0,
      anomaliesCount: anomalies.count || 0,
    };
  },

  // Récupérer les stats par province
  getStatsByProvince: async () => {
    const { data, error } = await supabase
      .from('provinces')
      .select(`
        id,
        nom,
        code,
        nombre_inscrits,
        resultats_partiels(voix, taux_participation),
        anomalies(id)
      `);

    if (error) throw error;
    return data;
  },
};

/**
 * SERVICE CONFIGURATION
 */
export const configService = {
  // Récupérer les seuils d'anomalies
  getConfigAnomalies: async () => {
    const { data, error } = await supabase
      .from('config_anomalies')
      .select('*')
      .eq('actif', true);

    if (error) throw error;
    return data;
  },

  // Récupérer un seuil spécifique
  getConfigValue: async (parametre: string) => {
    const { data, error } = await supabase
      .from('config_anomalies')
      .select('valeur_seuil')
      .eq('parametre', parametre)
      .single();

    if (error) throw error;
    return data?.valeur_seuil;
  },
};

/**
 * SERVICE EXPORT
 */
export const exportService = {
  // Enregistrer un export
  createExport: async (titre: string, format: string, urlFichier: string) => {
    const { data, error } = await supabase
      .from('exports')
      .insert([{ titre, format, url_fichier: urlFichier }])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // Récupérer l'historique des exports
  getExportHistory: async () => {
    const { data, error } = await supabase
      .from('exports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  },
};
