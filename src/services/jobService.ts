import { supabase } from '../lib/supabase';
import type { JobWithCustomer, JobStatus } from '../types/database';

export interface CreateJobInput {
  workspace_id: string;
  customer_id: string;
  quote_id?: string | null;
  title: string;
  scheduled_date?: string | null;
  is_recurring?: boolean;
  repeat_months?: number;
  status?: JobStatus;
  notes?: string | null;
}

/**
 * Computes next scheduled date for a recurring job:
 * old scheduled_date + repeat_months (or now + repeat_months if missing)
 */
export function computeNextRecurringDate(currentDateStr?: string | null, repeatMonths: number = 1): string {
  const months = repeatMonths > 0 ? repeatMonths : 1;
  const baseDate = currentDateStr ? new Date(currentDateStr) : new Date();
  const nextDate = new Date(baseDate.getTime());
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate.toISOString();
}

/**
 * Checks whether a job's scheduled_date is due in the current week (Monday through Sunday).
 */
export function isDueThisWeek(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  // Start of current week (Monday)
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // End of current week (Sunday 23:59:59)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return d >= startOfWeek && d <= endOfWeek;
}

/**
 * Fetches all jobs for a workspace with joined customer and quote data.
 */
export async function fetchJobs(
  workspaceId: string
): Promise<{ data: JobWithCustomer[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, customers(id, name, phone, email, address), quotes(id, quote_number, title, total)')
      .eq('workspace_id', workspaceId)
      .order('scheduled_date', { ascending: true, nullsFirst: false });

    if (error) {
      // Fallback simple query
      const { data: simpleData, error: simpleErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('scheduled_date', { ascending: true, nullsFirst: false });

      if (simpleErr) {
        return { data: null, error: simpleErr.message };
      }

      return { data: (simpleData || []) as JobWithCustomer[], error: null };
    }

    const formatted: JobWithCustomer[] = (data || []).map((j: any) => ({
      ...j,
      customer: j.customers || null,
      quote: j.quotes || null,
    }));

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch jobs.';
    return { data: null, error: msg };
  }
}

/**
 * Creates a new job row for the current workspace.
 */
export async function createJob(
  input: CreateJobInput
): Promise<{ data: JobWithCustomer | null; error: string | null }> {
  try {
    if (!input.title.trim()) {
      return { data: null, error: 'Job title is required.' };
    }
    if (!input.customer_id) {
      return { data: null, error: 'Please select a customer for this job.' };
    }

    const payload = {
      workspace_id: input.workspace_id,
      customer_id: input.customer_id,
      quote_id: input.quote_id || null,
      title: input.title.trim(),
      scheduled_date: input.scheduled_date ? new Date(input.scheduled_date).toISOString() : null,
      is_recurring: Boolean(input.is_recurring),
      repeat_months: input.is_recurring ? Number(input.repeat_months) || 1 : 0,
      status: input.status || 'scheduled',
      notes: input.notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert(payload)
      .select('*, customers(id, name, phone, email, address), quotes(id, quote_number, title, total)')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const formatted: JobWithCustomer = {
      ...data,
      customer: (data as any)?.customers || null,
      quote: (data as any)?.quotes || null,
    };

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create job.';
    return { data: null, error: msg };
  }
}

/**
 * Updates an existing job.
 * RULE: When a recurring job is marked done, automatically create the next job with
 * scheduled_date = old date + repeat_months, same customer and title, status scheduled.
 */
export async function updateJob(
  jobId: string,
  workspaceId: string,
  updates: Partial<CreateJobInput>,
  existingJob?: JobWithCustomer
): Promise<{
  data: JobWithCustomer | null;
  nextJob: JobWithCustomer | null;
  error: string | null;
}> {
  try {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.customer_id !== undefined) payload.customer_id = updates.customer_id;
    if (updates.quote_id !== undefined) payload.quote_id = updates.quote_id || null;
    if (updates.scheduled_date !== undefined) {
      payload.scheduled_date = updates.scheduled_date
        ? new Date(updates.scheduled_date).toISOString()
        : null;
    }
    if (updates.is_recurring !== undefined) payload.is_recurring = Boolean(updates.is_recurring);
    if (updates.repeat_months !== undefined) payload.repeat_months = Number(updates.repeat_months) || 0;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null;

    const { data, error } = await supabase
      .from('jobs')
      .update(payload)
      .eq('id', jobId)
      .eq('workspace_id', workspaceId)
      .select('*, customers(id, name, phone, email, address), quotes(id, quote_number, title, total)')
      .single();

    if (error) {
      return { data: null, nextJob: null, error: error.message };
    }

    const updatedJob: JobWithCustomer = {
      ...data,
      customer: (data as any)?.customers || existingJob?.customer || null,
      quote: (data as any)?.quotes || existingJob?.quote || null,
    };

    // Auto-create next recurring job if marked done
    let nextJob: JobWithCustomer | null = null;
    const isNowDone = updates.status === 'done';
    const isRecurring =
      updates.is_recurring !== undefined ? updates.is_recurring : existingJob?.is_recurring || false;
    const repeatMonths =
      updates.repeat_months !== undefined
        ? Number(updates.repeat_months)
        : existingJob?.repeat_months || 1;

    if (isNowDone && isRecurring && repeatMonths > 0) {
      const baseDate = existingJob?.scheduled_date || updatedJob.scheduled_date;
      const nextScheduledDate = computeNextRecurringDate(baseDate, repeatMonths);

      const nextJobRes = await createJob({
        workspace_id: workspaceId,
        customer_id: updatedJob.customer_id,
        quote_id: updatedJob.quote_id,
        title: updatedJob.title,
        scheduled_date: nextScheduledDate,
        is_recurring: true,
        repeat_months: repeatMonths,
        status: 'scheduled',
        notes: updatedJob.notes || null,
      });

      if (nextJobRes.data) {
        nextJob = nextJobRes.data;
      }
    }

    return { data: updatedJob, nextJob, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update job.';
    return { data: null, nextJob: null, error: msg };
  }
}

/**
 * Deletes a job row.
 */
export async function deleteJob(
  jobId: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .eq('workspace_id', workspaceId);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete job.';
    return { error: msg };
  }
}

/**
 * Seeds sample jobs for initial demonstration if none exist.
 */
export async function seedSampleJobs(
  workspaceId: string,
  customers: { id: string; name: string }[]
): Promise<void> {
  if (!customers || customers.length === 0) return;

  const now = new Date();
  // Job 1: Due in 2 days (this week)
  const dateIn2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  dateIn2Days.setHours(10, 0, 0, 0);

  // Job 2: Due tomorrow (this week, recurring every 6 months)
  const dateTomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  dateTomorrow.setHours(14, 30, 0, 0);

  // Job 3: Due in 12 days (next week, recurring every 3 months)
  const dateIn12Days = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
  dateIn12Days.setHours(9, 0, 0, 0);

  const samplePayloads: CreateJobInput[] = [
    {
      workspace_id: workspaceId,
      customer_id: customers[0].id,
      title: 'AC Annual Preventative Maintenance & Coil Cleaning',
      scheduled_date: dateTomorrow.toISOString(),
      is_recurring: true,
      repeat_months: 6,
      status: 'scheduled',
      notes: 'Check refrigerant pressure, clean evaporator coils, and inspect thermostat.',
    },
    {
      workspace_id: workspaceId,
      customer_id: customers.length > 1 ? customers[1].id : customers[0].id,
      title: 'Commercial Rooftop Unit Diagnostic & Filter Replacement',
      scheduled_date: dateIn2Days.toISOString(),
      is_recurring: false,
      repeat_months: 0,
      status: 'scheduled',
      notes: 'Customer reported minor rattling noise during peak hours. Full diagnostic inspection.',
    },
    {
      workspace_id: workspaceId,
      customer_id: customers.length > 2 ? customers[2].id : customers[0].id,
      title: 'Quarterly Multi-Split System Health Check',
      scheduled_date: dateIn12Days.toISOString(),
      is_recurring: true,
      repeat_months: 3,
      status: 'scheduled',
      notes: 'Quarterly regular inspection of multi-split units in main facility.',
    },
  ];

  for (const job of samplePayloads) {
    await createJob(job);
  }
}
