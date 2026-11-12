import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import {
  fetchJobs,
  createJob,
  updateJob,
  deleteJob,
  seedSampleJobs,
  isDueThisWeek,
  type CreateJobInput,
} from '../services/jobService';
import { fetchCustomers, seedSampleCustomers } from '../services/customerService';
import { fetchQuotes } from '../services/quoteService';
import type { JobWithCustomer, Customer, QuoteWithCustomer, JobStatus } from '../types/database';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Repeat,
  Trash2,
  Edit2,
  Check,
  CalendarDays,
  List,
  Loader2,
} from 'lucide-react';

export const JobsPage: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  // Core Data
  const [jobs, setJobs] = useState<JobWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<QuoteWithCustomer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // View state: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal state (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingJob, setEditingJob] = useState<JobWithCustomer | null>(null);
  const [modalSaving, setModalSaving] = useState<boolean>(false);

  // Form Fields
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formQuoteId, setFormQuoteId] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formScheduledDate, setFormScheduledDate] = useState<string>('');
  const [formIsRecurring, setFormIsRecurring] = useState<boolean>(false);
  const [formRepeatMonths, setFormRepeatMonths] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<JobStatus>('scheduled');
  const [formNotes, setFormNotes] = useState<string>('');

  // Quick Action In-Progress state
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  // Load initial data
  const loadData = async () => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Customers
      let { data: custList } = await fetchCustomers(workspace.id);
      if (!custList || custList.length === 0) {
        await seedSampleCustomers(workspace.id);
        const res = await fetchCustomers(workspace.id);
        custList = res.data;
      }
      setCustomers(custList || []);

      // 2. Fetch Quotes
      const { data: quoteList } = await fetchQuotes(workspace.id);
      setQuotes(quoteList || []);

      // 3. Fetch Jobs
      let { data: jobList, error: jobErr } = await fetchJobs(workspace.id);
      if (jobErr) {
        setErrorMsg(jobErr);
      } else if (!jobList || jobList.length === 0) {
        // Auto-seed sample jobs if none exist
        if (custList && custList.length > 0) {
          await seedSampleJobs(workspace.id, custList);
          const reloaded = await fetchJobs(workspace.id);
          jobList = reloaded.data;
        }
      }
      setJobs(jobList || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load jobs.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace?.id]);

  // Open Create Job Modal (optionally with preselected date)
  const handleOpenCreateModal = (defaultDate?: Date) => {
    setEditingJob(null);
    setFormCustomerId(customers.length > 0 ? customers[0].id : '');
    setFormQuoteId('');
    setFormTitle('');

    // Format date for datetime-local (YYYY-MM-DDTHH:mm)
    const targetDate = defaultDate || new Date();
    if (!defaultDate) {
      // Set to tomorrow at 10:00 AM by default
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(10, 0, 0, 0);
    }
    const localIso = formatForDateTimeLocal(targetDate);
    setFormScheduledDate(localIso);

    setFormIsRecurring(false);
    setFormRepeatMonths(1);
    setFormStatus('scheduled');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Job Modal
  const handleOpenEditModal = (job: JobWithCustomer) => {
    setEditingJob(job);
    setFormCustomerId(job.customer_id);
    setFormQuoteId(job.quote_id || '');
    setFormTitle(job.title);
    setFormScheduledDate(job.scheduled_date ? formatForDateTimeLocal(new Date(job.scheduled_date)) : '');
    setFormIsRecurring(job.is_recurring);
    setFormRepeatMonths(job.repeat_months || 1);
    setFormStatus(job.status);
    setFormNotes(job.notes || '');
    setIsModalOpen(true);
  };

  // Save Job (Create or Update)
  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    if (!formTitle.trim()) {
      alert('Please enter a job title.');
      return;
    }
    if (!formCustomerId) {
      alert('Please select a customer.');
      return;
    }

    setModalSaving(true);
    setErrorMsg(null);

    const inputData: CreateJobInput = {
      workspace_id: workspace.id,
      customer_id: formCustomerId,
      quote_id: formQuoteId || null,
      title: formTitle.trim(),
      scheduled_date: formScheduledDate ? new Date(formScheduledDate).toISOString() : null,
      is_recurring: formIsRecurring,
      repeat_months: formIsRecurring ? formRepeatMonths : 0,
      status: formStatus,
      notes: formNotes.trim() || null,
    };

    try {
      if (editingJob) {
        const { data, nextJob, error } = await updateJob(
          editingJob.id,
          workspace.id,
          inputData,
          editingJob
        );
        if (error || !data) {
          setErrorMsg(error || 'Failed to update job.');
        } else {
          setJobs((prev) =>
            prev.map((j) => (j.id === editingJob.id ? data : j))
          );
          if (nextJob) {
            setJobs((prev) => [...prev, nextJob]);
            setSuccessBanner(
              `Recurring job "${data.title}" marked done! Next job automatically scheduled for ${formatShortDate(
                nextJob.scheduled_date
              )}.`
            );
          } else {
            setSuccessBanner(`Job "${data.title}" updated successfully.`);
          }
          setIsModalOpen(false);
        }
      } else {
        const { data, error } = await createJob(inputData);
        if (error || !data) {
          setErrorMsg(error || 'Failed to create job.');
        } else {
          setJobs((prev) => [...prev, data]);
          setSuccessBanner(`New job "${data.title}" successfully scheduled!`);
          setIsModalOpen(false);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving job.');
    } finally {
      setModalSaving(false);
    }
  };

  // Quick Action: Mark Job as Done
  // CRITICAL RULE: When a recurring job is marked done, automatically create the next job with
  // scheduled_date = old date + repeat_months, same customer and title, status scheduled.
  const handleMarkJobDone = async (job: JobWithCustomer) => {
    if (!workspace?.id) return;
    setUpdatingJobId(job.id);
    setErrorMsg(null);

    try {
      const { data, nextJob, error } = await updateJob(
        job.id,
        workspace.id,
        { status: 'done' },
        job
      );

      if (error || !data) {
        setErrorMsg(error || 'Failed to mark job as done.');
      } else {
        setJobs((prev) => prev.map((j) => (j.id === job.id ? data : j)));
        if (nextJob) {
          setJobs((prev) => [...prev, nextJob]);
          setSuccessBanner(
            `Job "${job.title}" marked done! Next recurring job scheduled for ${formatShortDate(
              nextJob.scheduled_date
            )}.`
          );
        } else {
          setSuccessBanner(`Job "${job.title}" completed.`);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating job status.');
    } finally {
      setUpdatingJobId(null);
    }
  };

  // Delete Job
  const handleDeleteJob = async (job: JobWithCustomer) => {
    if (!workspace?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${job.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await deleteJob(job.id, workspace.id);
      if (error) {
        setErrorMsg(error);
      } else {
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
        setSuccessBanner(`Job "${job.title}" deleted.`);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error deleting job.');
    }
  };

  // Create Quote from Job: opens /quotes/new with the customer already selected
  const handleCreateQuoteFromJob = (job: JobWithCustomer) => {
    navigate('/quotes/new?customerId=' + encodeURIComponent(job.customer_id), {
      state: {
        customerId: job.customer_id,
        suggestedTitle: `Quote for ${job.title}`,
      },
    });
  };

  // Due this week list
  const dueThisWeekJobs = useMemo(() => {
    return jobs.filter((j) => isDueThisWeek(j.scheduled_date) && j.status === 'scheduled');
  }, [jobs]);

  // Filtered jobs for list view
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesSearch =
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  // Month Calendar Computations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Map jobs by date string "YYYY-MM-DD"
  const jobsByDate = useMemo(() => {
    const map: Record<string, JobWithCustomer[]> = {};
    jobs.forEach((j) => {
      if (!j.scheduled_date) return;
      const d = new Date(j.scheduled_date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(j);
    });
    return map;
  }, [jobs]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Title suggestions helper
  const titleSuggestions = [
    'Annual AC Preventative Maintenance',
    'AC Gas & Refrigerant Refill',
    'Emergency Compressor Diagnostic',
    'Filter Replacement & Coil Cleaning',
    'Heating System Seasonal Tune-Up',
    'Ductwork & Airflow Inspection',
    'Thermostat Calibration & Check',
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                Phase 7 Scheduling
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Workspace: {workspace?.business_name || 'Haris HVAC Services'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              Job Scheduling & Maintenance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Plan scheduled jobs, track one-off and recurring maintenance, and convert visits into quotes.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle: Calendar vs List */}
            <div className="inline-flex p-1 bg-gray-200 rounded-xl">
              <button
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Month Calendar View"
              >
                <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5 text-blue-600" />
                <span>List View</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Job</span>
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between shadow-xs">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-emerald-900 font-medium">{successBanner}</p>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900">Notice</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading scheduled jobs & calendar...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: "Due This Week" Section at the Top */}
            <div className="mb-8 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 rounded-2xl border border-amber-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-amber-100">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                  <span>Due This Week</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-200/80 text-amber-900">
                    {dueThisWeekJobs.length} {dueThisWeekJobs.length === 1 ? 'Job' : 'Jobs'}
                  </span>
                </h2>
                <p className="text-xs text-gray-500">
                  Scheduled upcoming appointments and urgent maintenance for the current week.
                </p>
              </div>
            </div>

            {dueThisWeekJobs.length > 0 && (
              <span className="hidden sm:inline-flex items-center text-xs text-amber-700 font-medium">
                Monday — Sunday
              </span>
            )}
          </div>

          <div className="mt-4">
            {dueThisWeekJobs.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-800">No pending jobs due this week!</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  All work for this week is completed or none scheduled yet.
                </p>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Schedule Job for This Week</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueThisWeekJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs hover:border-amber-400 hover:shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge bar */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{formatShortDate(job.scheduled_date)}</span>
                        </span>

                        {job.is_recurring && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                            <Repeat className="w-3 h-3 mr-0.5" />
                            <span>Every {job.repeat_months} mo{job.repeat_months > 1 ? 's' : ''}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                        {job.title}
                      </h3>

                      {/* Customer Info */}
                      <div className="mt-2.5 flex items-start space-x-2 text-xs text-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {job.customer?.name || 'Customer'}
                          </p>
                          {job.customer?.phone && (
                            <p className="text-gray-500 text-[11px]">{job.customer.phone}</p>
                          )}
                          {job.customer?.address && (
                            <p className="text-gray-400 text-[11px] truncate max-w-[200px]">
                              {job.customer.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Linked Quote if present */}
                      {job.quote && (
                        <div className="mt-2 inline-flex items-center space-x-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-medium">
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>Linked: {job.quote.quote_number}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {job.notes && (
                        <p className="mt-2 text-xs text-gray-500 italic line-clamp-2">
                          "{job.notes}"
                        </p>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => handleMarkJobDone(job)}
                        disabled={updatingJobId === job.id}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                        title="Mark Done (auto-schedules next if recurring)"
                      >
                        {updatingJobId === job.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Mark Done</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCreateQuoteFromJob(job)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Create Quote for Customer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(job)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          title="Edit Job"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Calendar View vs List View */}
        {viewMode === 'calendar' ? (
          /* MONTH CALENDAR VIEW */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Calendar Controls */}
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {monthName} {year}
                </h2>
                <button
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-xs transition"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-100/70 text-center text-xs font-bold text-gray-600 py-2.5">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-200 border-b border-gray-200">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[105px] bg-gray-50/40 p-2" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(year, month, dayNum);
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;
                const dayJobs = jobsByDate[dateKey] || [];

                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`min-h-[105px] p-2 flex flex-col justify-between group transition hover:bg-blue-50/20 ${
                      isToday ? 'bg-blue-50/40' : 'bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                              : 'text-gray-700'
                          }`}
                        >
                          {dayNum}
                        </span>

                        <button
                          onClick={() => handleOpenCreateModal(cellDate)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded text-[10px] transition"
                          title={`Schedule job on ${monthName} ${dayNum}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Jobs scheduled on this day */}
                      <div className="mt-1.5 space-y-1">
                        {dayJobs.slice(0, 3).map((job) => (
                          <div
                            key={job.id}
                            onClick={() => handleOpenEditModal(job)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate cursor-pointer transition flex items-center space-x-1 ${
                              job.status === 'done'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : job.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-500 line-through'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                            title={`${job.title} (${job.customer?.name || 'Customer'})`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                job.status === 'done'
                                  ? 'bg-emerald-500'
                                  : job.status === 'cancelled'
                                  ? 'bg-gray-400'
                                  : 'bg-blue-500'
                              }`}
                            />
                            <span className="truncate">{job.title}</span>
                          </div>
                        ))}

                        {dayJobs.length > 3 && (
                          <span className="text-[10px] text-gray-500 font-semibold px-1">
                            +{dayJobs.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Search and Filters */}
            <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search jobs by title, customer, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['all', 'scheduled', 'done', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* List Table */}
            {filteredJobs.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-900">No jobs found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== 'all'
                    ? 'No jobs match your search or filter criteria.'
                    : 'Get started by scheduling your first trade maintenance or service visit.'}
                </p>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule Job</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Job Title & Notes</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Scheduled Date</th>
                      <th className="py-3 px-4">Recurrence</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50/70 transition">
                        {/* Title & Notes */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-gray-900 text-sm">{job.title}</p>
                          {job.notes && (
                            <p className="text-gray-500 text-xs mt-0.5 truncate">{job.notes}</p>
                          )}
                          {job.quote && (
                            <span className="inline-flex items-center space-x-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded mt-1 border border-blue-100">
                              <FileText className="w-3 h-3 text-blue-500" />
                              <span>Quote {job.quote.quote_number}</span>
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-900">
                            {job.customer?.name || 'Customer'}
                          </p>
                          {job.customer?.phone && (
                            <p className="text-gray-500 text-[11px]">{job.customer.phone}</p>
                          )}
                        </td>

                        {/* Scheduled Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {job.scheduled_date ? (
                            <div>
                              <p className="font-semibold text-gray-900">
                                {formatShortDate(job.scheduled_date)}
                              </p>
                              <p className="text-gray-500 text-[11px]">
                                {formatTime(job.scheduled_date)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Not set</span>
                          )}
                        </td>

                        {/* Recurrence */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {job.is_recurring ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              <Repeat className="w-3 h-3 text-purple-600 mr-0.5" />
                              <span>Every {job.repeat_months} mo{job.repeat_months > 1 ? 's' : ''}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">One-off</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(job.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            {job.status === 'scheduled' && (
                              <button
                                onClick={() => handleMarkJobDone(job)}
                                disabled={updatingJobId === job.id}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                                title="Mark Done (will schedule next recurring job if enabled)"
                              >
                                {updatingJobId === job.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                )}
                                <span>Done</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleCreateQuoteFromJob(job)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition"
                              title="Create Quote for Customer"
                            >
                              <Plus className="w-3 h-3 text-blue-600" />
                              <span>Quote</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(job)}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                              title="Edit Job"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteJob(job)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </>
    )}

    {/* CREATE / EDIT JOB MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 relative my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {editingJob ? 'Edit Scheduled Job' : 'Schedule New Job'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      All jobs are saved with your workspace under active security policies.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveJob} className="mt-4 space-y-4 text-xs sm:text-sm">
                {/* Customer Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="" disabled>
                      Select a customer...
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AC Annual Maintenance & Gas Refill"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {/* Suggestions Chips */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {titleSuggestions.slice(0, 3).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFormTitle(sug)}
                        className="text-[10px] text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded transition"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Linked Quote (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Linked Quote <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formQuoteId}
                    onChange={(e) => setFormQuoteId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">No linked quote</option>
                    {quotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quote_number} — {q.title} (${Number(q.total).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scheduled Date & Time */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formScheduledDate}
                    onChange={(e) => setFormScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Recurring Options */}
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-purple-900 flex items-center space-x-1.5">
                        <Repeat className="w-3.5 h-3.5 text-purple-600" />
                        <span>Recurring Service Plan</span>
                      </p>
                      <p className="text-[11px] text-purple-700">
                        When marked done, automatically creates the next job.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsRecurring}
                        onChange={(e) => setFormIsRecurring(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {formIsRecurring && (
                    <div className="pt-2 border-t border-purple-200/60">
                      <label className="block text-xs font-bold text-purple-900 mb-1">
                        Repeat Frequency
                      </label>
                      <select
                        value={formRepeatMonths}
                        onChange={(e) => setFormRepeatMonths(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        <option value={1}>Every 1 Month (Monthly)</option>
                        <option value={2}>Every 2 Months (Bi-Monthly)</option>
                        <option value={3}>Every 3 Months (Quarterly)</option>
                        <option value={6}>Every 6 Months (Semi-Annually)</option>
                        <option value={12}>Every 12 Months (Annually)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as JobStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="scheduled">Scheduled (Upcoming)</option>
                    <option value="done">Done (Completed)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Work Notes & Scope
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Special instructions, unit model, access codes, customer requests..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Submit buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {modalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingJob ? 'Update Job' : 'Schedule Job'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Helpers
function formatForDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderStatusBadge(status: JobStatus) {
  switch (status) {
    case 'done':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Done</span>
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 text-red-600" />
          <span>Cancelled</span>
        </span>
      );
    case 'scheduled':
    default:
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 text-blue-600" />
          <span>Scheduled</span>
        </span>
      );
  }
}
