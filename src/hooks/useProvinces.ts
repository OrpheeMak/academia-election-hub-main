// hooks/useProvinces.ts
// Hook pour récupérer et gérer les données des provinces

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { Province, ProvinceWithStats } from '@/types/database';

export const useProvinces = (electionId?: string) => {
  return useQuery({
    queryKey: ['provinces', electionId],
    queryFn: async () => {
      let query = supabase.from('provinces').select('*');
      
      if (electionId) {
        query = query.eq('election_id', electionId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Province[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });
};

/**
 * Hook pour récupérer une province avec ses statistiques
 */
export const useProvinceWithStats = (provinceId: string) => {
  return useQuery({
    queryKey: ['province-stats', provinceId],
    queryFn: async () => {
      // Récupérer les données de la province
      const { data: province } = await supabase
        .from('provinces')
        .select('*')
        .eq('id', provinceId)
        .single();

      if (!province) throw new Error('Province non trouvée');

      // Récupérer les résultats pour cette province
      const { data: resultats } = await supabase
        .from('resultats_partiels')
        .select('*')
        .eq('province_id', provinceId);

      // Récupérer les anomalies pour cette province
      const { data: anomalies } = await supabase
        .from('anomalies')
        .select('*')
        .eq('province_id', provinceId);

      const totalVoix = resultats?.reduce((sum, r) => sum + r.voix, 0) || 0;
      const taux_participation = resultats?.[0]?.taux_participation || 0;
      const anomalies_count = anomalies?.length || 0;

      return {
        ...province,
        totalVoix,
        taux_participation,
        anomalies_count,
      } as ProvinceWithStats;
    },
    enabled: !!provinceId,
    staleTime: 1000 * 60 * 2,
  });
};
