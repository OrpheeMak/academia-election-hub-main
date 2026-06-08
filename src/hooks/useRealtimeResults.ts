// src/hooks/useRealtimeResults.ts
// Hook personnalisé qui écoute les INSERT Supabase Realtime
// Met à jour le store en temps réel

import { useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useElectionStore, type Resultat, type Anomalie } from '../store/electionStore';
import { toast } from 'sonner';

export function useRealtimeResults() {
  const { addResultat, addAnomalie, setConnected } = useElectionStore();

  useEffect(() => {
    let subscription: any = null;

    const setupRealtime = async () => {
      try {
        console.log('🔌 Connexion Realtime Supabase...');

        // Écoute les INSERT sur resultats_partiels
        const channel = supabase
          .channel('resultat_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'resultats_partiels',
            },
            (payload) => {
              const resultat = payload.new as Resultat;
              console.log('📊 Nouveau résultat reçu:', resultat.candidat_nom);

              // Ajoute au store
              addResultat(resultat);

              // Toast de confirmation (silencieux si pas anomalie)
              if (resultat.is_anomalie) {
                toast.warning(`⚠️ Anomalie détectée: ${resultat.anomalie_type}`, {
                  description: `${resultat.candidat_nom} - Taux: ${resultat.taux_participation.toFixed(1)}%`,
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'anomalies',
            },
            (payload) => {
              const anomalie = payload.new as Anomalie;
              console.log('🚨 Anomalie enregistrée:', anomalie.type_anomalie);

              // Ajoute au store
              addAnomalie(anomalie);

              // Toast d'alerte selon gravité
              const icon =
                anomalie.gravite === 'critique'
                  ? '🚨'
                  : anomalie.gravite === 'moyen'
                    ? '⚠️'
                    : 'ℹ️';

              toast(
                `${icon} ${anomalie.type_anomalie.replace(/_/g, ' ').toUpperCase()}`,
                {
                  description: anomalie.description,
                  duration: anomalie.gravite === 'critique' ? 10000 : 5000,
                }
              );
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime connecté');
              setConnected(true);
            } else if (status === 'CLOSED') {
              console.log('❌ Realtime fermé');
              setConnected(false);
            }
          });

        subscription = channel;
      } catch (error) {
        console.error('❌ Erreur Realtime:', error);
        setConnected(false);
        toast.error('Erreur connexion temps réel');
      }
    };

    setupRealtime();

    // Cleanup
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [addResultat, addAnomalie, setConnected]);
}

/**
 * Hook pour charger les données historiques (au démarrage)
 */
export async function loadHistoricalData() {
  const { setElection, setCirconscriptions, addResultat, addAnomalie } =
    useElectionStore.getState();

  try {
    // Charge l'élection
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (electionError || !election) {
      console.warn('Aucune élection trouvée');
      return;
    }

    setElection(election);

    // Charge les circonscriptions
    const { data: circonscriptions } = await supabase
      .from('circonscriptions')
      .select('*')
      .eq('election_id', election.id);

    if (circonscriptions) {
      setCirconscriptions(circonscriptions);
    }

    // Charge les résultats existants
    const { data: resultats } = await supabase
      .from('resultats_partiels')
      .select('*')
      .eq('election_id', election.id)
      .order('timestamp_insertion', { ascending: false })
      .limit(1000);

    if (resultats) {
      resultats.forEach((r) => addResultat(r));
    }

    // Charge les anomalies existantes
    const { data: anomalies } = await supabase
      .from('anomalies')
      .select('*')
      .order('timestamp_detection', { ascending: false })
      .limit(500);

    if (anomalies) {
      anomalies.forEach((a) => addAnomalie(a));
    }

    console.log('✅ Données historiques chargées');
  } catch (error) {
    console.error('❌ Erreur chargement données:', error);
  }
}
