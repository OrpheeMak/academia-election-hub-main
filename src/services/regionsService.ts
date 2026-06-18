import { supabase } from '../config/supabase';

export interface Region {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export const regionsService = {
  async getAll(): Promise<Region[]> {
    const { data, error } = await supabase
      .from('provinces')
      .select('*')
      .order('nom');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Region | null> {
    const { data, error } = await supabase
      .from('provinces')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async create(region: Omit<Region, 'id' | 'created_at'>): Promise<Region> {
    const { data, error } = await supabase
      .from('provinces')
      .insert([region])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};
