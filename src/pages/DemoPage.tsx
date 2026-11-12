import React, { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Wrench,
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Receipt,
  Calendar,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  Eye,
  Share2,
  Copy,
  Check,
  ExternalLink,
  FileDown,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
  X,
} from 'lucide-react';
import {
  DEMO_WORKSPACE,
  DEMO_PRICE_BOOK,
  DEMO_CUSTOMERS,
  DEMO_QUOTES,
  DEMO_QUOTE_LINE_ITEMS,
  DEMO_INVOICES,
  DEMO_JOBS,
  DEMO_SHARE_TOKEN,
} from '../services/demoData';
import { exportQuotePDF, exportInvoicePDF } from '../utils/pdfGenerator';
import type { QuoteWithCustomer } from '../types/database';

type DemoSection = 'dashboard' | 'price-book' | 'customers' | 'quotes' | 'invoices' | 'jobs';

export const DemoPage: React.FC = () => {
  const { section: urlSection } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  // Validate active section
  const validSections: DemoSection[] = ['dashboard', 'price-book', 'customers', 'quotes', 'invoices', 'jobs'];
  const activeSection: DemoSection =
    urlSection && validSections.includes(urlSection as DemoSection)
      ? (urlSection as DemoSection)
      : 'dashboard';

  const setSection = (sec: DemoSection) => {
    navigate(sec === 'dashboard' ? '/demo' : `/demo/${sec}`);
  };

  // ---------------------------------------------------------------------------
  // Price Book State
  // ---------------------------------------------------------------------------
  const [priceBookSearch, setPriceBookSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredPriceBook = useMemo(() => {
    return DEMO_PRICE_BOOK.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(priceBookSearch.toLowerCase()) ||
        item.description?.toLowerCase().includes(priceBookSearch.toLowerCase());
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [priceBookSearch, selectedCategory]);

  // ---------------------------------------------------------------------------
  // Customers State
  // ---------------------------------------------------------------------------
  const [customerSearch, setCustomerSearch] = useState('');

  const customerStatsMap = useMemo(() => {
    const stats: Record<string, { quotesCount: number; acceptedTotal: number }> = {};
    DEMO_QUOTES.forEach((q) => {
      if (!q.customer_id) return;
      if (!stats[q.customer_id]) {
        stats[q.customer_id] = { quotesCount: 0, acceptedTotal: 0 };
      }
      stats[q.customer_id].quotesCount += 1;
      if (q.status === 'accepted') {
        stats[q.customer_id].acceptedTotal += q.total;
      }
    });
    return stats;
  }, []);

  const filteredCustomers = useMemo(() => {
    return DEMO_CUSTOMERS.filter((c) => {
      const q = customerSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q)
      );
    });
  }, [customerSearch]);

  // ---------------------------------------------------------------------------
  // Quotes State
  // ---------------------------------------------------------------------------
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('all');
  const [previewQuote, setPreviewQuote] = useState<QuoteWithCustomer | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const filteredQuotes = useMemo(() => {
    return DEMO_QUOTES.filter((q) => {
      const s = quoteSearch.toLowerCase();
      const matchesSearch =
        q.quote_number.toLowerCase().includes(s) ||
        q.title.toLowerCase().includes(s) ||
        (q.customer?.name || '').toLowerCase().includes(s);
      const matchesStatus = quoteStatusFilter === 'all' || q.status === quoteStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quoteSearch, quoteStatusFilter]);

  const acceptedQuotesTotal = useMemo(() => {
    return DEMO_QUOTES.filter((q) => q.status === 'accepted').reduce((sum, q) => sum + q.total, 0);
  }, []);

  const handleCopyShareLink = (token: string) => {
    const shareUrl = `${window.location.origin}/q/${token}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 3000);
    });
  };

  // ---------------------------------------------------------------------------
  // Invoices State
  // ---------------------------------------------------------------------------
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    return DEMO_INVOICES.filter((inv) => {
      if (invoiceStatusFilter === 'all') return true;
      return inv.status === invoiceStatusFilter;
    });
  }, [invoiceStatusFilter]);

  const totalInvoiced = useMemo(() => DEMO_INVOICES.reduce((sum, i) => sum + i.amount, 0), []);
  const totalPaid = useMemo(
    () => DEMO_INVOICES.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    []
  );
  const totalOutstanding = totalInvoiced - totalPaid;

  const handleCopyPaymentLink = (invId: string, url: string | null) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedInvoiceId(invId);
      setTimeout(() => setCopiedInvoiceId(null), 3000);
    });
  };

  // ---------------------------------------------------------------------------
  // Jobs State
  // ---------------------------------------------------------------------------
  const [jobViewMode, setJobViewMode] = useState<'calendar' | 'list'>('calendar');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  const filteredJobs = useMemo(() => {
    return DEMO_JOBS.filter((j) => {
      if (jobStatusFilter === 'all') return true;
      return j.status === jobStatusFilter;
    });
  }, [jobStatusFilter]);

  const dueThisWeekJobs = useMemo(() => {
    return DEMO_JOBS.filter((j) => {
      if (!j.scheduled_date) return false;
      const d = new Date(j.scheduled_date);
      const now = new Date();
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() + diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return d >= startOfWeek && d <= endOfWeek;
    });
  }, []);

  // Calendar Grid Computations
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; jobs: typeof DEMO_JOBS }[] = [];

    // Prev month overflow
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, isCurrentMonth: false, jobs: [] });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const matchingJobs = DEMO_JOBS.filter((j) => {
        if (!j.scheduled_date) return false;
        const jd = new Date(j.scheduled_date);
        return (
          jd.getFullYear() === d.getFullYear() &&
          jd.getMonth() === d.getMonth() &&
          jd.getDate() === d.getDate()
        );
      });
      days.push({ date: d, isCurrentMonth: true, jobs: matchingJobs });
    }

    // Next month overflow to complete 35 or 42 grid cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, jobs: [] });
    }

    return days;
  }, [calendarDate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1. REQUIRED CLEAR DEMO BANNER */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span className="font-extrabold uppercase tracking-wide bg-amber-700/60 px-2 py-0.5 rounded text-[11px]">
              Demo - sample data only
            </span>
            <span className="font-medium text-amber-50">
              Interactive preview for <span className="font-bold underline decoration-amber-300">CoolAir HVAC Services</span>.
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="hidden md:inline text-amber-100/90 font-medium">
              Read-only mode: all edit, save & delete actions are disabled.
            </span>
            <Link
              to="/signup"
              className="inline-flex items-center space-x-1 px-3 py-1 bg-white text-amber-800 font-bold rounded-md hover:bg-amber-50 transition shadow-xs text-xs"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. DEMO TOP NAVIGATION */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-5">
            <Link to="/" className="flex items-center space-x-2 text-gray-900 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">TradeQuote AI</span>
            </Link>

            {/* Demo Workspace Badge */}
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-900">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-bold">CoolAir HVAC Services</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-900 text-[10px] uppercase font-bold">
                HVAC Demo
              </span>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <nav className="flex items-center space-x-1 overflow-x-auto py-1">
            <button
              onClick={() => setSection('dashboard')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setSection('price-book')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'price-book'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Price Book</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold">8</span>
            </button>
            <button
              onClick={() => setSection('customers')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'customers'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Customers</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-bold">5</span>
            </button>
            <button
              onClick={() => setSection('quotes')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'quotes'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Quotes</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">6</span>
            </button>
            <button
              onClick={() => setSection('invoices')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'invoices'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
              <span>Invoices</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-bold">2</span>
            </button>
            <button
              onClick={() => setSection('jobs')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'jobs'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Jobs</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">4</span>
            </button>
          </nav>

          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-2.5 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* 3. MAIN SECTION CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ================================================================= */}
        {/* SECTION A: DASHBOARD VIEW                                         */}
        {/* ================================================================= */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Company Hero Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                        CoolAir HVAC Services
                      </h1>
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                        HVAC
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="inline-flex items-center text-gray-600">
                        <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        (555) 321-7890
                      </span>
                      <span className="inline-flex items-center text-gray-600">
                        <Mail className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        service@coolairhvac.com
                      </span>
                      <span className="inline-flex items-center text-emerald-600 font-semibold">
                        <Shield className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        Public Demo Workspace
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled
                    title="Disabled in Demo mode"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-semibold cursor-not-allowed"
                  >
                    <span>+ New Quote</span>
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.2 rounded">Read-only</span>
                  </button>
                  <button
                    disabled
                    title="Disabled in Demo mode"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-semibold cursor-not-allowed"
                  >
                    <span>+ Add Customer</span>
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.2 rounded">Read-only</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div
                onClick={() => setSection('price-book')}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-blue-400 cursor-pointer transition"
              >
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-semibold uppercase">Price Book</span>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-3 text-2xl font-extrabold text-gray-900">8</div>
                <div className="mt-1 text-xs text-gray-500">Sample HVAC items</div>
              </div>

              <div
                onClick={() => setSection('customers')}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-purple-400 cursor-pointer transition"
              >
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-semibold uppercase">Customers</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-3 text-2xl font-extrabold text-gray-900">5</div>
                <div className="mt-1 text-xs text-gray-500">Commercial & residential</div>
              </div>

              <div
                onClick={() => setSection('quotes')}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-400 cursor-pointer transition"
              >
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-semibold uppercase">Quotes</span>
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-3 text-2xl font-extrabold text-gray-900">6</div>
                <div className="mt-1 text-xs text-emerald-600 font-semibold">$680.00 accepted</div>
              </div>

              <div
                onClick={() => setSection('invoices')}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-indigo-400 cursor-pointer transition"
              >
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-semibold uppercase">Invoices</span>
                  <Receipt className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-3 text-2xl font-extrabold text-gray-900">2</div>
                <div className="mt-1 text-xs text-indigo-600 font-semibold">1 paid ($350), 1 unpaid ($330)</div>
              </div>

              <div
                onClick={() => setSection('jobs')}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-amber-400 cursor-pointer transition col-span-2 lg:col-span-1"
              >
                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-xs font-semibold uppercase">Jobs</span>
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-3 text-2xl font-extrabold text-gray-900">4</div>
                <div className="mt-1 text-xs text-amber-600 font-semibold">2 recurring AC plans</div>
              </div>
            </div>

            {/* Featured Demo Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Working Public Share Link Highlight */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 shadow-xs">
                <div className="flex items-center space-x-2 text-emerald-800 mb-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base">Interactive Public Quote Link</h3>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  One quote in this demo (<span className="font-bold">TQ-1001 for Oakridge Dental Clinic</span>) is in <strong>Sent</strong> status with an active public share link. Visitors can open the customer accept page, view line items and total, and test customer acceptance with zero login required.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a
                    href={`/q/${DEMO_SHARE_TOKEN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow-xs"
                  >
                    <span>Open Customer Accept Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleCopyShareLink(DEMO_SHARE_TOKEN)}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition"
                  >
                    {copiedToken === DEMO_SHARE_TOKEN ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken === DEMO_SHARE_TOKEN ? 'Link Copied!' : 'Copy Share Link'}</span>
                  </button>
                </div>
              </div>

              {/* Read-Only Safety Details */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-xs">
                <div className="flex items-center space-x-2 text-blue-900 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-base">Isolated Demo & Multi-Tenant RLS</h3>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed">
                  This demo environment is completely read-only. Demo visitors cannot modify or delete company data, and all demo data is completely isolated from real user workspaces governed by Supabase Row Level Security.
                </p>
                <div className="mt-4">
                  <span className="inline-flex items-center text-xs font-semibold text-blue-800 bg-blue-100 px-2.5 py-1 rounded">
                    Banner: "Demo - sample data only" enforced across all views
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION B: PRICE BOOK VIEW                                        */}
        {/* ================================================================= */}
        {activeSection === 'price-book' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">HVAC Price Book</h2>
                <p className="text-xs text-gray-500">Standard rates for parts, labor, and services.</p>
              </div>

              <button
                disabled
                title="Disabled in Demo mode"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-semibold cursor-not-allowed self-start sm:self-auto"
              >
                <span>+ Add Item</span>
                <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.2 rounded">Read-only</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search price book..."
                  value={priceBookSearch}
                  onChange={(e) => setPriceBookSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-1 self-start sm:self-auto">
                {['all', 'service', 'labour', 'part'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Book Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Item Name</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Unit</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-600 uppercase">Price</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPriceBook.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-gray-500 text-[11px] mt-0.5 max-w-md">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.category === 'service'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.category === 'labour'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 font-medium">{item.unit}</td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-medium cursor-not-allowed"
                          title="Editing disabled in Demo mode"
                        >
                          Locked
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION C: CUSTOMERS VIEW                                         */}
        {/* ================================================================= */}
        {activeSection === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Customers (5)</h2>
                <p className="text-xs text-gray-500">Commercial facilities and residential accounts.</p>
              </div>

              <button
                disabled
                title="Disabled in Demo mode"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-semibold cursor-not-allowed self-start sm:self-auto"
              >
                <span>+ Add Customer</span>
                <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.2 rounded">Read-only</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search customers by name, email, address..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((cust) => {
                const stats = customerStatsMap[cust.id] || { quotesCount: 0, acceptedTotal: 0 };
                return (
                  <div
                    key={cust.id}
                    className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="font-bold text-gray-900 text-sm">{cust.name}</div>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                          Read-only
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                        {cust.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                        {cust.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{cust.email}</span>
                          </div>
                        )}
                        {cust.address && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{cust.address}</span>
                          </div>
                        )}
                      </div>

                      {cust.notes && (
                        <p className="mt-3 text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                          {cust.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        Quotes: <strong className="text-gray-800">{stats.quotesCount}</strong>
                      </span>
                      <span className="text-emerald-700 font-bold">
                        ${stats.acceptedTotal.toFixed(2)} accepted
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION D: QUOTES VIEW                                            */}
        {/* ================================================================= */}
        {activeSection === 'quotes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quotes (6)</h2>
                <p className="text-xs text-gray-500">
                  2 draft, 1 sent (with public share link), 2 accepted, 1 declined.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled
                  title="Disabled in Demo mode"
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-semibold cursor-not-allowed"
                >
                  <span>+ New Quote</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.2 rounded">Read-only</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search quotes by #, title, customer..."
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-1 self-start sm:self-auto overflow-x-auto py-1">
                {['all', 'draft', 'sent', 'accepted', 'declined'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setQuoteStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                      quoteStatusFilter === st
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Quotes List Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Quote #</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Customer & Title</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-600 uppercase">Total</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase">Interactive Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3.5 font-bold text-blue-600">
                        {q.quote_number}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900">{q.customer?.name || 'Customer'}</div>
                        <div className="text-gray-500 text-[11px] mt-0.5">{q.title}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            q.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.status === 'sent'
                              ? 'bg-blue-100 text-blue-800'
                              : q.status === 'draft'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {q.status === 'accepted' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {q.status === 'sent' && <Send className="w-3 h-3 text-blue-600" />}
                          {q.status === 'draft' && <Clock className="w-3 h-3 text-gray-500" />}
                          {q.status === 'declined' && <XCircle className="w-3 h-3 text-red-600" />}
                          <span>{q.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">
                        ${q.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Working Share Link for Sent Quote */}
                          {q.share_token && (
                            <>
                              <button
                                onClick={() => handleCopyShareLink(q.share_token!)}
                                title="Copy public share link"
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold transition"
                              >
                                {copiedToken === q.share_token ? (
                                  <Check className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <Share2 className="w-3 h-3 text-blue-600" />
                                )}
                                <span>{copiedToken === q.share_token ? 'Copied' : 'Share'}</span>
                              </button>
                              <a
                                href={`/q/${q.share_token}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open customer accept page"
                                className="inline-flex items-center p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}

                          {/* Preview Details Button */}
                          <button
                            onClick={() => setPreviewQuote(q)}
                            className="inline-flex items-center space-x-1 px-2 py-1 text-gray-700 hover:bg-gray-100 rounded text-[11px] font-medium transition"
                            title="Preview line items"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span>Preview</span>
                          </button>

                          {/* PDF Export Button */}
                          <button
                            onClick={() => {
                              const lines = DEMO_QUOTE_LINE_ITEMS[q.id] || [];
                              exportQuotePDF(q, DEMO_WORKSPACE, lines);
                            }}
                            className="inline-flex items-center p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Download Quote PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total pipeline card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">
                Total 6 quotes across active pipeline:
              </span>
              <div className="flex items-center space-x-4">
                <span>
                  Total Pipeline: <strong className="text-gray-900">$1,605.00</strong>
                </span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Accepted Revenue: ${acceptedQuotesTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION E: INVOICES VIEW                                          */}
        {/* ================================================================= */}
        {activeSection === 'invoices' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invoices (2)</h2>
                <p className="text-xs text-gray-500">1 paid invoice ($350.00), 1 unpaid invoice ($330.00).</p>
              </div>

              <button
                disabled
                title="Disabled in Demo mode"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-semibold cursor-not-allowed self-start sm:self-auto"
              >
                <span>+ Create Invoice</span>
                <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.2 rounded">Read-only</span>
              </button>
            </div>

            {/* Metric Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="text-xs font-semibold text-gray-500 uppercase">Total Invoiced</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">${totalInvoiced.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="text-xs font-semibold text-emerald-600 uppercase">Paid Total</div>
                <div className="text-xl font-extrabold text-emerald-700 mt-1">${totalPaid.toFixed(2)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <div className="text-xs font-semibold text-amber-600 uppercase">Outstanding</div>
                <div className="text-xl font-extrabold text-amber-700 mt-1">${totalOutstanding.toFixed(2)}</div>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-1">
              {['all', 'unpaid', 'paid'].map((st) => (
                <button
                  key={st}
                  onClick={() => setInvoiceStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                    invoiceStatusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Due Date / Paid</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-600 uppercase">Amount</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3.5 font-bold text-blue-600">{inv.invoice_number}</td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900">{inv.customer?.name}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {inv.status === 'paid' ? (
                          <span className="text-emerald-700 font-medium">Paid Nov 10, 2026</span>
                        ) : (
                          <span>Due {inv.due_date}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">
                        ${inv.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {inv.status === 'unpaid' && inv.stripe_checkout_url && (
                            <button
                              onClick={() => handleCopyPaymentLink(inv.id, inv.stripe_checkout_url)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-[11px] font-semibold transition"
                              title="Copy Stripe payment link"
                            >
                              {copiedInvoiceId === inv.id ? (
                                <Check className="w-3 h-3 text-indigo-600" />
                              ) : (
                                <CreditCard className="w-3 h-3 text-indigo-600" />
                              )}
                              <span>{copiedInvoiceId === inv.id ? 'Copied' : 'Payment Link'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => exportInvoicePDF(inv, DEMO_WORKSPACE, inv.line_items || [])}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-gray-700 hover:bg-gray-100 rounded text-[11px] font-medium transition"
                            title="Download Invoice PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 text-gray-500" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION F: JOBS VIEW                                              */}
        {/* ================================================================= */}
        {activeSection === 'jobs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Jobs & Scheduling (4)</h2>
                <p className="text-xs text-gray-500">2 recurring AC services (bi-annual & quarterly).</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setJobViewMode('calendar')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${
                      jobViewMode === 'calendar' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    onClick={() => setJobViewMode('list')}
                    className={`px-3 py-1 rounded-md font-semibold transition ${
                      jobViewMode === 'list' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    List
                  </button>
                </div>

                <button
                  disabled
                  title="Disabled in Demo mode"
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-semibold cursor-not-allowed"
                >
                  <span>+ Schedule Job</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1 py-0.2 rounded">Read-only</span>
                </button>
              </div>
            </div>

            {/* "Due this week" Highlight Section */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center space-x-2 text-amber-900 mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm">Due This Week ({dueThisWeekJobs.length})</h3>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  High Priority
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dueThisWeekJobs.map((j) => (
                  <div
                    key={j.id}
                    className="bg-white p-3.5 rounded-lg border border-amber-200/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-xs">{j.customer?.name}</span>
                        {j.is_recurring && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                            Repeats every {j.repeat_months} mos
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-gray-700 mt-1">{j.title}</div>
                      <div className="text-[11px] text-gray-500 mt-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>{new Date(j.scheduled_date!).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 font-medium">Read-only Demo</span>
                      <button
                        onClick={() => setSection('quotes')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View Quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar View */}
            {jobViewMode === 'calendar' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() =>
                        setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
                      }
                      className="p-1 rounded hover:bg-gray-100 text-gray-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCalendarDate(new Date())}
                      className="px-2.5 py-1 text-xs font-semibold rounded hover:bg-gray-100 text-gray-700"
                    >
                      Today
                    </button>
                    <button
                      onClick={() =>
                        setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
                      }
                      className="p-1 rounded hover:bg-gray-100 text-gray-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="bg-gray-50 py-2 text-center text-[11px] font-bold text-gray-500 uppercase">
                      {d}
                    </div>
                  ))}

                  {calendarDays.map((cd, idx) => (
                    <div
                      key={idx}
                      className={`min-h-[85px] bg-white p-1.5 transition ${
                        !cd.isCurrentMonth ? 'bg-gray-50/60 text-gray-400' : ''
                      }`}
                    >
                      <div className="text-[11px] font-bold text-gray-700">{cd.date.getDate()}</div>
                      <div className="mt-1 space-y-1">
                        {cd.jobs.map((job) => (
                          <div
                            key={job.id}
                            className={`p-1 rounded text-[10px] font-semibold leading-tight truncate ${
                              job.status === 'done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                            title={`${job.title} - ${job.customer?.name}`}
                          >
                            {job.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List View */}
            {jobViewMode === 'list' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center space-x-1">
                  {['all', 'scheduled', 'done'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setJobStatusFilter(st)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                        jobStatusFilter === st
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Job Title</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Scheduled Date</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Recurrence</th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-4 py-3.5 font-bold text-gray-900">{j.title}</td>
                        <td className="px-4 py-3.5 text-gray-700">{j.customer?.name}</td>
                        <td className="px-4 py-3.5 text-gray-600 font-medium">
                          {j.scheduled_date ? new Date(j.scheduled_date).toLocaleString() : 'Unscheduled'}
                        </td>
                        <td className="px-4 py-3.5">
                          {j.is_recurring ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              Every {j.repeat_months} months
                            </span>
                          ) : (
                            <span className="text-gray-400">One-time</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              j.status === 'done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. QUOTE PREVIEW MODAL */}
      {previewQuote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                  {previewQuote.quote_number}
                </span>
                <h3 className="text-lg font-bold text-gray-900">{previewQuote.title}</h3>
              </div>
              <button
                onClick={() => setPreviewQuote(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded-lg">
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <div className="font-bold text-gray-900 mt-0.5">{previewQuote.customer?.name}</div>
                  <div className="text-gray-600 text-[11px]">{previewQuote.customer?.address}</div>
                </div>
                <div>
                  <span className="text-gray-500">Contractor:</span>
                  <div className="font-bold text-gray-900 mt-0.5">{DEMO_WORKSPACE.business_name}</div>
                  <div className="text-gray-600 text-[11px]">Trade: {DEMO_WORKSPACE.trade_type}</div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-600 mb-2">Line Items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Description</th>
                        <th className="px-3 py-2 text-center font-bold text-gray-600">Qty</th>
                        <th className="px-3 py-2 text-right font-bold text-gray-600">Unit Price</th>
                        <th className="px-3 py-2 text-right font-bold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(DEMO_QUOTE_LINE_ITEMS[previewQuote.id] || []).map((li) => (
                        <tr key={li.id}>
                          <td className="px-3 py-2 font-medium text-gray-900">{li.description}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{li.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-600">${li.unit_price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">${li.line_total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-56 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${previewQuote.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200">
                    <span>Total:</span>
                    <span>${previewQuote.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {previewQuote.share_token && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-medium">Public link ready for customer review:</span>
                  <a
                    href={`/q/${previewQuote.share_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 font-bold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    <span>Open Accept Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Demo Mode - Read-only</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const lines = DEMO_QUOTE_LINE_ITEMS[previewQuote.id] || [];
                    exportQuotePDF(previewQuote, DEMO_WORKSPACE, lines);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setPreviewQuote(null)}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
