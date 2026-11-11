import { supabase } from '../lib/supabase';
import type { PriceBookItem, ItemCategory, ItemUnit } from '../types/database';

export interface SeedItem {
  name: string;
  category: ItemCategory;
  unit: ItemUnit;
  unit_price: number;
  description: string;
  is_active: boolean;
}

export const SAMPLE_HVAC_ITEMS: SeedItem[] = [
  {
    name: 'AC General Service',
    category: 'service',
    unit: 'job',
    unit_price: 45,
    description: 'General system inspection, indoor & outdoor coil cleaning, drain check, and airflow performance testing',
    is_active: true,
  },
  {
    name: 'AC Gas Refill R32',
    category: 'service',
    unit: 'job',
    unit_price: 120,
    description: 'System vacuuming, pressure test, and R32 refrigerant gas recharge to manufacturer specs',
    is_active: true,
  },
  {
    name: 'Copper Pipe',
    category: 'part',
    unit: 'foot',
    unit_price: 6,
    description: 'Standard refrigeration-grade insulated copper tubing for refrigerant lines',
    is_active: true,
  },
  {
    name: 'Pipe Fitting Labour',
    category: 'labour',
    unit: 'hour',
    unit_price: 55,
    description: 'On-site brazing, cutting, flaring, routing, and vacuum testing of piping line sets',
    is_active: true,
  },
  {
    name: 'Water Pump Replacement',
    category: 'service',
    unit: 'job',
    unit_price: 180,
    description: 'Removal and replacement of faulty AC condensate water drain pump with electrical reconnection',
    is_active: true,
  },
  {
    name: 'Drain Line Cleaning',
    category: 'service',
    unit: 'job',
    unit_price: 60,
    description: 'High-pressure nitrogen / chemical flush of clogged AC drain pan and condensation line',
    is_active: true,
  },
  {
    name: 'Thermostat (Digital)',
    category: 'part',
    unit: 'each',
    unit_price: 85,
    description: 'Multi-stage digital programmable wall thermostat with backlit display',
    is_active: true,
  },
  {
    name: 'Compressor Repair Labour',
    category: 'labour',
    unit: 'hour',
    unit_price: 70,
    description: 'Electrical diagnostic, capacitor/contactor testing, and compressor terminal re-wiring',
    is_active: true,
  },
];

export async function fetchPriceBookItems(workspaceId: string): Promise<{ data: PriceBookItem[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('price_book_items')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data as PriceBookItem[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch price book items.';
    return { data: null, error: msg };
  }
}

export async function createPriceBookItem(
  item: Omit<PriceBookItem, 'id' | 'created_at'>
): Promise<{ data: PriceBookItem | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('price_book_items')
      .insert([item])
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as PriceBookItem, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create price book item.';
    return { data: null, error: msg };
  }
}

export async function updatePriceBookItem(
  id: string,
  workspaceId: string,
  updates: Partial<Omit<PriceBookItem, 'id' | 'workspace_id' | 'created_at'>>
): Promise<{ data: PriceBookItem | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('price_book_items')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as PriceBookItem, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update price book item.';
    return { data: null, error: msg };
  }
}

export async function deletePriceBookItem(
  id: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('price_book_items')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete price book item.';
    return { error: msg };
  }
}

export async function seedWorkspacePriceBook(
  workspaceId: string
): Promise<{ count: number; error: string | null }> {
  try {
    const itemsToInsert = SAMPLE_HVAC_ITEMS.map((item) => ({
      ...item,
      workspace_id: workspaceId,
    }));

    const { data, error } = await supabase
      .from('price_book_items')
      .insert(itemsToInsert)
      .select();

    if (error) {
      return { count: 0, error: error.message };
    }
    return { count: data?.length || itemsToInsert.length, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to seed sample HVAC items.';
    return { count: 0, error: msg };
  }
}
