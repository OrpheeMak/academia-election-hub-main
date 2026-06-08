import { supabase } from '../config/supabase';

export interface Simulation {
  id: number;
  name: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ElectionResult {
  id: number;
  simulation_id: number;
  region_id: number;
  votes: number;
  percentage: number;
  created_at: string;
}

export const simulationsService = {
  async getAll(): Promise<Simulation[]> {
    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(simulation: Omit<Simulation, 'id' | 'created_at' | 'updated_at'>): Promise<Simulation> {
    const { data, error } = await supabase
      .from('simulations')
      .insert([simulation])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async addResults(results: Omit<ElectionResult, 'id' | 'created_at'>[]): Promise<ElectionResult[]> {
    const { data, error } = await supabase
      .from('election_results')
      .insert(results)
      .select();
    
    if (error) throw error;
    return data || [];
  },

  async getResults(simulationId: number): Promise<ElectionResult[]> {
    const { data, error } = await supabase
      .from('election_results')
      .select('*')
      .eq('simulation_id', simulationId);
    
    if (error) throw error;
    return data || [];
  },
};
