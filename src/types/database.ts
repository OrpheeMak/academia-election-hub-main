// Types pour la base de données Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      elections: {
        Row: {
          id: string
          nom: string
          type: 'présidentielle' | 'législative' | 'locale' | 'référendum'
          date_election: string
          date_creation: string
          statut: 'prévue' | 'en_cours' | 'terminée' | 'annulée'
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          type: 'présidentielle' | 'législative' | 'locale' | 'référendum'
          date_election: string
          date_creation?: string
          statut?: 'prévue' | 'en_cours' | 'terminée' | 'annulée'
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          type?: 'présidentielle' | 'législative' | 'locale' | 'référendum'
          date_election?: string
          date_creation?: string
          statut?: 'prévue' | 'en_cours' | 'terminée' | 'annulée'
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      provinces: {
        Row: {
          id: string
          nom: string
          code: string
          nombre_inscrits: number | null
          nombre_bureaux: number | null
          latitude: number | null
          longitude: number | null
          region: string | null
          election_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          code: string
          nombre_inscrits?: number | null
          nombre_bureaux?: number | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          election_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          code?: string
          nombre_inscrits?: number | null
          nombre_bureaux?: number | null
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          election_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      candidats: {
        Row: {
          id: string
          nom: string
          parti_politique: string | null
          couleur_chart: string | null
          logo_url: string | null
          election_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          parti_politique?: string | null
          couleur_chart?: string | null
          logo_url?: string | null
          election_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          parti_politique?: string | null
          couleur_chart?: string | null
          logo_url?: string | null
          election_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      resultats_partiels: {
        Row: {
          id: string
          timestamp: string
          province_id: string | null
          candidat_id: string | null
          voix: number
          bureaux_depouilles: number
          total_bureaux: number
          taux_participation: number | null
          pourcentage_voix: number | null
          is_anomalie: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          timestamp?: string
          province_id?: string | null
          candidat_id?: string | null
          voix: number
          bureaux_depouilles: number
          total_bureaux: number
          taux_participation?: number | null
          pourcentage_voix?: number | null
          is_anomalie?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          province_id?: string | null
          candidat_id?: string | null
          voix?: number
          bureaux_depouilles?: number
          total_bureaux?: number
          taux_participation?: number | null
          pourcentage_voix?: number | null
          is_anomalie?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      anomalies: {
        Row: {
          id: string
          resultat_id: string | null
          province_id: string | null
          type_anomalie: 'zscore' | 'iqr' | 'participation_incoherente' | 'voix_superieures_inscrits' | 'ecart_significatif'
          description: string
          gravite: 'faible' | 'moyenne' | 'critique'
          valeur_detectee: number | null
          seuil_declenchement: number | null
          timestamp_detection: string
          est_lue: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resultat_id?: string | null
          province_id?: string | null
          type_anomalie: 'zscore' | 'iqr' | 'participation_incoherente' | 'voix_superieures_inscrits' | 'ecart_significatif'
          description: string
          gravite: 'faible' | 'moyenne' | 'critique'
          valeur_detectee?: number | null
          seuil_declenchement?: number | null
          timestamp_detection?: string
          est_lue?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resultat_id?: string | null
          province_id?: string | null
          type_anomalie?: 'zscore' | 'iqr' | 'participation_incoherente' | 'voix_superieures_inscrits' | 'ecart_significatif'
          description?: string
          gravite?: 'faible' | 'moyenne' | 'critique'
          valeur_detectee?: number | null
          seuil_declenchement?: number | null
          timestamp_detection?: string
          est_lue?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      alertes: {
        Row: {
          id: string
          anomalie_id: string | null
          titre: string
          message: string
          type: 'info' | 'warning' | 'error' | 'success'
          est_lue: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          anomalie_id?: string | null
          titre: string
          message: string
          type: 'info' | 'warning' | 'error' | 'success'
          est_lue?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          anomalie_id?: string | null
          titre?: string
          message?: string
          type?: 'info' | 'warning' | 'error' | 'success'
          est_lue?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      regions: {
        Row: {
          id: number
          name: string
          latitude: number
          longitude: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          latitude: number
          longitude: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          latitude?: number
          longitude?: number
          created_at?: string
        }
      }
      simulations: {
        Row: {
          id: number
          name: string
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      election_results: {
        Row: {
          id: number
          simulation_id: number
          region_id: number
          votes: number
          percentage: number
          created_at: string
        }
        Insert: {
          id?: number
          simulation_id: number
          region_id: number
          votes: number
          percentage: number
          created_at?: string
        }
        Update: {
          id?: number
          simulation_id?: number
          region_id?: number
          votes?: number
          percentage?: number
          created_at?: string
        }
      }
      simulation_logs: {
        Row: {
          id: string
          election_id: string
          status: 'running' | 'paused' | 'completed' | 'cancelled'
          config: Json | null
          stats: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          election_id: string
          status?: 'running' | 'paused' | 'completed' | 'cancelled'
          config?: Json | null
          stats?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          election_id?: string
          status?: 'running' | 'paused' | 'completed' | 'cancelled'
          config?: Json | null
          stats?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          app_role: 'admin' | 'moderator' | 'user'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          app_role: 'admin' | 'moderator' | 'user'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          app_role?: 'admin' | 'moderator' | 'user'
          created_at?: string
        }
      }
      votes: {
        Row: {
          id: number
          simulation_id: number
          region_id: number
          votes: number
          percentage: number
          created_at: string
        }
        Insert: {
          id?: number
          simulation_id: number
          region_id: number
          votes: number
          percentage: number
          created_at?: string
        }
        Update: {
          id?: number
          simulation_id?: number
          region_id?: number
          votes?: number
          percentage?: number
          created_at?: string
        }
      }
      config_anomalies: {
        Row: {
          id: string
          parametre: string
          valeur_seuil: number
          description: string | null
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parametre: string
          valeur_seuil: number
          description?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parametre?: string
          valeur_seuil?: number
          description?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Types personnalisés pour l'application
export type Election = Database['public']['Tables']['elections']['Row'];
export type Province = Database['public']['Tables']['provinces']['Row'];
export type Candidat = Database['public']['Tables']['candidats']['Row'];
export type ResultatPartiel = Database['public']['Tables']['resultats_partiels']['Row'];
export type Anomalie = Database['public']['Tables']['anomalies']['Row'];
export type Alerte = Database['public']['Tables']['alertes']['Row'];
export type ConfigAnomalie = Database['public']['Tables']['config_anomalies']['Row'];

// Types étendus pour l'UI
export interface ProvinceWithStats extends Province {
  totalVoix?: number
  taux_participation?: number
  anomalies_count?: number
}

export interface ResultatAvecCandidatEtProvince extends ResultatPartiel {
  candidat?: Candidat
  province?: Province
}

export interface AnomalieAvecDetails extends Anomalie {
  resultat?: ResultatPartiel
  province?: Province
}

export interface CirconscriptionResult {
  id: string;
  nom: string;
  voix: number;
  taux_participation: number;
}
