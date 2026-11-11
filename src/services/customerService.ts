import { supabase } from '../lib/supabase';
import type { Customer } from '../types/database';

export interface CustomerStats {
  quotesCount: number;
  acceptedTotal: number;
}

export const SAMPLE_CUSTOMERS = [
  {
    name: 'Robert Henderson',
    phone: '(555) 234-5678',
    email: 'robert.henderson@example.com',
    address: '742 Evergreen Terrace, Springfield',
    notes: 'Residential customer. Annual AC maintenance plan preferred.',
  },
  {
    name: 'Oakridge Dental Clinic',
    phone: '(555) 876-5432',
    email: 'facilities@oakridgedental.com',
    address: '1200 Commercial Way, Suite 4B',
    notes: 'Commercial rooftop packaged unit. Requires weekend servicing.',
  },
  {
    name: 'Marcus Vance',
    phone: '(555) 345-6789',
    email: 'marcus.vance@example.com',
    address: '88 Birchwood Drive, West End',
    notes: 'Inquired about multi-split AC installation for home renovation.',
  },
];

export async function fetchCustomers(
  workspaceId: string
): Promise<{ data: Customer[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data as Customer[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch customers.';
    return { data: null, error: msg };
  }
}

export async function fetchCustomerQuoteStats(
  workspaceId: string
): Promise<{ stats: Record<string, CustomerStats>; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('id, customer_id, status, total')
      .eq('workspace_id', workspaceId);

    if (error) {
      return { stats: {}, error: error.message };
    }

    const statsMap: Record<string, CustomerStats> = {};
    (data || []).forEach((q: { customer_id: string; status: string; total: number | null }) => {
      if (!q.customer_id) return;
      if (!statsMap[q.customer_id]) {
        statsMap[q.customer_id] = { quotesCount: 0, acceptedTotal: 0 };
      }
      statsMap[q.customer_id].quotesCount += 1;
      if (q.status === 'accepted') {
        statsMap[q.customer_id].acceptedTotal += Number(q.total || 0);
      }
    });

    return { stats: statsMap, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to calculate quote statistics.';
    return { stats: {}, error: msg };
  }
}

export async function createCustomer(
  customer: Omit<Customer, 'id' | 'created_at'>
): Promise<{ data: Customer | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Customer, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create customer.';
    return { data: null, error: msg };
  }
}

export async function updateCustomer(
  id: string,
  workspaceId: string,
  updates: Partial<Omit<Customer, 'id' | 'workspace_id' | 'created_at'>>
): Promise<{ data: Customer | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Customer, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update customer.';
    return { data: null, error: msg };
  }
}

export async function deleteCustomer(
  id: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete customer.';
    return { error: msg };
  }
}

export async function seedSampleCustomers(
  workspaceId: string
): Promise<{ count: number; error: string | null }> {
  try {
    const items = SAMPLE_CUSTOMERS.map((c) => ({
      ...c,
      workspace_id: workspaceId,
    }));

    const { data, error } = await supabase.from('customers').insert(items).select();
    if (error) return { count: 0, error: error.message };
    return { count: data?.length || items.length, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to seed sample customers.';
    return { count: 0, error: msg };
  }
}
