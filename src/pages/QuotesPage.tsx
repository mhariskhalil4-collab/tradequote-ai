import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import {
  fetchQuotes,
  fetchQuoteDetails,
  updateQuoteStatus,
  deleteQuote,
  shareQuote,
} from '../services/quoteService';
import { createInvoiceFromQuote } from '../services/invoiceService';
import { exportQuotePDF } from '../utils/pdfGenerator';
import type { QuoteWithCustomer, QuoteLineItem, QuoteStatus } from '../types/database';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  DollarSign,
  Sparkles,
  X,
  Loader2,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Receipt,
  FileDown,
} from 'lucide-react';

export const QuotesPage: React.FC = () => {
  const { workspace } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<QuoteWithCustomer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Preview Modal
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithCustomer | null>(null);
  const [modalItems, setModalItems] = useState<QuoteLineItem[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Status Change In-Progress
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Share & Copy feedback states
  const [sharingQuoteId, setSharingQuoteId] = useState<string | null>(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null);

  const loadQuotes = async () => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchQuotes(workspace.id);
      if (error) {
        setErrorMsg(error);
      } else {
        setQuotes(data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load quotes.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();

    // Check location state for success message from NewQuotePage
    if (location.state && (location.state as any).message) {
      setSuccessBanner((location.state as any).message);
      window.history.replaceState({}, document.title);
    }
  }, [workspace?.id]);

  // Open Preview Modal
  const handleOpenPreview = async (quote: QuoteWithCustomer) => {
    if (!workspace?.id) return;
    setSelectedQuote(quote);
    setShowModal(true);
    setModalLoading(true);

    try {
      const { items } = await fetchQuoteDetails(quote.id, workspace.id);
      setModalItems(items);
    } catch (err) {
      console.error('Failed to load quote line items:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Quick Status Update
  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus) => {
    if (!workspace?.id) return;
    setUpdatingId(quoteId);
    try {
      const { error } = await updateQuoteStatus(quoteId, workspace.id, newStatus);
      if (!error) {
        setQuotes((prev) =>
          prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q))
        );
        if (selectedQuote && selectedQuote.id === quoteId) {
          setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete Quote
  const handleDeleteQuote = async (quoteId: string, quoteNum: string) => {
    if (!workspace?.id) return;
    if (!confirm(`Are you sure you want to delete quote ${quoteNum}? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await deleteQuote(quoteId, workspace.id);
      if (!error) {
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
        if (showModal && selectedQuote?.id === quoteId) {
          setShowModal(false);
        }
      } else {
        alert(`Failed to delete quote: ${error}`);
      }
    } catch (err) {
      console.error('Failed to delete quote:', err);
    }
  };

  // Share Quote Handler (generates share_token, sets expires_at to 7 days from now, sets status = 'sent', and saves to database)
  const handleShareQuote = async (quote: QuoteWithCustomer) => {
    setSharingQuoteId(quote.id);
    setErrorMsg(null);
    try {
      const { data, shareUrl, shareToken, error } = await shareQuote(quote.id, workspace?.id);
      if (error || !data) {
        const errMsg = error || 'Failed to save share token to database.';
        setErrorMsg(errMsg);
        return;
      }

      // Save succeeded! Copy link to clipboard and show success notice
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        // fallback
      }
      setCopiedQuoteId(quote.id);
      setTimeout(() => setCopiedQuoteId(null), 3500);

      setSuccessBanner(
        `Shareable link for ${quote.quote_number} generated & copied to clipboard! (Expires in 7 days)`
      );

      // Update state with saved share_token so Copy link button now appears
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quote.id
            ? {
                ...q,
                share_token: shareToken,
                expires_at: data.expires_at,
                status: 'sent',
              }
            : q
        )
      );

      if (selectedQuote && selectedQuote.id === quote.id) {
        setSelectedQuote((prev) =>
          prev
            ? {
                ...prev,
                share_token: shareToken,
                expires_at: data.expires_at,
                status: 'sent',
              }
            : null
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to share quote.';
      console.error('Failed to share quote:', err);
      setErrorMsg(msg);
    } finally {
      setSharingQuoteId(null);
    }
  };

  // Copy Link Handler (ONLY copies if quote already has an active share_token saved)
  const handleCopyLink = async (quote: QuoteWithCustomer) => {
    if (!quote.share_token) {
      setErrorMsg('This quote has not been shared yet. Please click Share first to generate and save a link.');
      return;
    }

    const shareUrl = `${window.location.origin}/q/${quote.share_token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedQuoteId(quote.id);
      setTimeout(() => setCopiedQuoteId(null), 3000);
      setSuccessBanner(`Shareable link for ${quote.quote_number} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Create Invoice Handler (creates invoice from accepted quote and copies line items)
  const handleCreateInvoice = async (quote: QuoteWithCustomer) => {
    if (!workspace?.id) return;
    setCreatingInvoiceId(quote.id);
    setErrorMsg(null);
    try {
      const { data, error } = await createInvoiceFromQuote(quote, workspace.id);
      if (error || !data) {
        setErrorMsg(error || 'Failed to create invoice.');
      } else {
        setSuccessBanner(
          `Invoice ${data.invoice_number} successfully created for ${quote.quote_number}! Amount: $${data.amount.toFixed(2)}`
        );
        navigate('/invoices');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creating invoice.');
    } finally {
      setCreatingInvoiceId(null);
    }
  };

  // PDF Export Handler
  const handleExportPDF = async (quote: QuoteWithCustomer, preloadedItems?: QuoteLineItem[]) => {
    try {
      if (preloadedItems && preloadedItems.length > 0) {
        exportQuotePDF(quote, workspace, preloadedItems);
        return;
      }
      let items = quote.quote_line_items || [];
      if (items.length === 0 && workspace?.id) {
        const { items: dbItems } = await fetchQuoteDetails(quote.id, workspace.id);
        if (dbItems && dbItems.length > 0) items = dbItems;
      }
      exportQuotePDF(quote, workspace, items);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Could not export PDF.');
    }
  };

  // Filtered quotes list
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pipeline stats
  const totalCount = quotes.length;
  const draftCount = quotes.filter((q) => q.status === 'draft').length;
  const sentCount = quotes.filter((q) => q.status === 'sent').length;
  const acceptedCount = quotes.filter((q) => q.status === 'accepted').length;
  const acceptedTotal = quotes
    .filter((q) => q.status === 'accepted')
    .reduce((sum, q) => sum + (Number(q.total) || 0), 0);

  const renderStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 text-gray-500" />
            <span>Draft</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Send className="w-3 h-3 text-blue-600" />
            <span>Sent</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Accepted</span>
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>Declined</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Expired</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Quotes
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Create, track, and manage quotes for {workspace?.business_name || 'your workspace'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/quotes/new"
              onClick={() => navigate('/quotes/new')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Quote</span>
            </Link>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start space-x-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-semibold">{successBanner}</div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-500 hover:text-emerald-700 font-bold text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">{errorMsg}</div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-600 font-bold text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Pipeline Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Total Quotes</span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 mt-2">{totalCount}</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Drafts</span>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-extrabold text-gray-700 mt-2">{draftCount}</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Sent / Out</span>
              <Send className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-extrabold text-blue-600 mt-2">{sentCount}</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Accepted Value</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-2 truncate">
              ${acceptedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-gray-400 font-medium">({acceptedCount} accepted)</span>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quote number, title, or customer..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {(['all', 'draft', 'sent', 'accepted', 'declined'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition ${
                  statusFilter === status
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Quotes Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading workspace quotes...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {searchTerm || statusFilter !== 'all' ? 'No matching quotes found' : 'No quotes created yet'}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Create your first estimate in seconds using plain English and your Price Book with AI.'}
            </p>
            <div className="mt-6">
              <Link
                to="/quotes/new"
                onClick={() => navigate('/quotes/new')}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create First Quote (TQ-1001)</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Quote #</th>
                    <th className="py-3.5 px-4">Title / Job</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50/75 transition">
                      {/* Quote Number */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleOpenPreview(q)}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          title="View quote details"
                        >
                          {q.quote_number}
                        </button>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 font-semibold text-gray-900 max-w-xs truncate text-xs sm:text-sm">
                        {q.title}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-gray-900">
                          {q.customer?.name || 'Customer'}
                        </div>
                        {q.customer?.phone && (
                          <div className="text-[11px] text-gray-400 font-mono">
                            {q.customer.phone}
                          </div>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(q.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Status & Quick Switcher */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {renderStatusBadge(q.status)}

                          <select
                            value={q.status}
                            disabled={updatingId === q.id}
                            onChange={(e) =>
                              handleStatusChange(q.id, e.target.value as QuoteStatus)
                            }
                            className="text-[10px] bg-transparent text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            title="Change status"
                          >
                            <option value="draft">draft</option>
                            <option value="sent">sent</option>
                            <option value="accepted">accepted</option>
                            <option value="declined">declined</option>
                            <option value="expired">expired</option>
                          </select>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-extrabold text-gray-900 text-xs sm:text-sm whitespace-nowrap">
                        ${Number(q.total).toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center space-x-1 sm:space-x-1.5">
                          {/* Create invoice button (shown on accepted quotes) */}
                          {q.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() => handleCreateInvoice(q)}
                              disabled={creatingInvoiceId === q.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition cursor-pointer"
                              title="Create Invoice from this accepted quote"
                            >
                              {creatingInvoiceId === q.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Receipt className="w-3.5 h-3.5" />
                              )}
                              <span>Create invoice</span>
                            </button>
                          )}

                          {/* Export PDF */}
                          <button
                            type="button"
                            onClick={() => handleExportPDF(q)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Download PDF Estimate"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          {/* Share button */}
                          <button
                            type="button"
                            onClick={() => handleShareQuote(q)}
                            disabled={sharingQuoteId === q.id}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer"
                            title={q.share_token ? 'Re-share quote (refresh 7 days)' : 'Share quote (generates link & marks as sent)'}
                          >
                            {sharingQuoteId === q.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </button>

                          {/* Copy link button: ONLY appears after that save succeeds and share_token exists */}
                          {Boolean(q.share_token) && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(q)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                copiedQuoteId === q.id
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                              }`}
                              title={copiedQuoteId === q.id ? 'Link copied!' : 'Copy shareable link'}
                            >
                              {copiedQuoteId === q.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(q)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="View quote details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuote(q.id, q.quote_number)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete quote"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* View Quote Details Modal */}
        {showModal && selectedQuote && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95">
              {/* Modal Header */}
              <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    TQ
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        {selectedQuote.quote_number}
                      </span>
                      {renderStatusBadge(selectedQuote.status)}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                      {selectedQuote.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Customer Details */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                      Client
                    </span>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {selectedQuote.customer?.name || 'Customer'}
                    </p>
                    {selectedQuote.customer?.address && (
                      <p className="text-gray-500 mt-0.5">{selectedQuote.customer.address}</p>
                    )}
                  </div>
                  <div className="text-left sm:text-right text-gray-600 space-y-0.5">
                    {selectedQuote.customer?.phone && <p>📞 {selectedQuote.customer.phone}</p>}
                    {selectedQuote.customer?.email && <p>✉️ {selectedQuote.customer.email}</p>}
                  </div>
                </div>

                {/* Shareable Customer Link Box */}
                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Share2 className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-gray-900">
                        Shareable Customer Link
                      </span>
                    </div>
                    {selectedQuote.expires_at && (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        {new Date(selectedQuote.expires_at) < new Date()
                          ? 'Link Expired'
                          : `Expires ${new Date(selectedQuote.expires_at).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>

                  {selectedQuote.share_token ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/q/${selectedQuote.share_token}`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-mono text-gray-800 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyLink(selectedQuote)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition cursor-pointer"
                        >
                          {copiedQuoteId === selectedQuote.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`/q/${selectedQuote.share_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-600 hover:text-purple-700 bg-white border border-gray-300 hover:bg-gray-50 transition cursor-pointer"
                          title="Open public estimate portal in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Anyone with this link can view and accept/decline without logging in.</span>
                        <button
                          type="button"
                          onClick={() => handleShareQuote(selectedQuote)}
                          className="text-purple-600 hover:text-purple-800 font-semibold underline cursor-pointer"
                        >
                          Re-share & refresh 7 days
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <p className="text-xs text-gray-600">
                        Generate a secure link valid for 7 days so your customer can approve this estimate online.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleShareQuote(selectedQuote)}
                        disabled={sharingQuoteId === selectedQuote.id}
                        className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
                      >
                        {sharingQuoteId === selectedQuote.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sharing...</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share Quote (7 Days)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Line Items Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Scope of Work & Line Items
                  </h4>
                  {modalLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Loading line items...</p>
                    </div>
                  ) : modalItems.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
                      No line items recorded for this quote.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3 text-center">Qty</th>
                            <th className="py-2.5 px-3 text-center">Unit</th>
                            <th className="py-2.5 px-3 text-right">Price</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {modalItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-2.5 px-3 font-medium text-gray-900">
                                {item.description}
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-600">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-500">
                                {item.unit}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-600 font-mono">
                                ${Number(item.unit_price).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-900 font-mono">
                                ${Number(item.line_total).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Notes if present */}
                {selectedQuote.notes && (
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Terms & Notes
                    </span>
                    <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                      {selectedQuote.notes}
                    </p>
                  </div>
                )}

                {/* Totals Summary */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900 font-mono">
                      ${Number(selectedQuote.subtotal).toFixed(2)}
                    </span>
                  </div>
                  {Number(selectedQuote.tax_percent) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax ({selectedQuote.tax_percent}%)</span>
                      <span className="font-semibold text-gray-900 font-mono">
                        $
                        {(
                          (Number(selectedQuote.subtotal) * Number(selectedQuote.tax_percent)) /
                          100
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
                    <span className="font-bold text-gray-900">Total Estimate</span>
                    <span className="font-extrabold text-blue-600 text-base font-mono">
                      ${Number(selectedQuote.total).toFixed(2)} {workspace?.currency || 'USD'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-gray-600">Status:</span>
                  <select
                    value={selectedQuote.status}
                    onChange={(e) =>
                      handleStatusChange(selectedQuote.id, e.target.value as QuoteStatus)
                    }
                    className="text-xs rounded-lg border border-gray-300 bg-white px-2 py-1 font-semibold text-gray-700"
                  >
                    <option value="draft">draft</option>
                    <option value="sent">sent</option>
                    <option value="accepted">accepted</option>
                    <option value="declined">declined</option>
                    <option value="expired">expired</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedQuote.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => handleCreateInvoice(selectedQuote)}
                      disabled={creatingInvoiceId === selectedQuote.id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      {creatingInvoiceId === selectedQuote.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Receipt className="w-3.5 h-3.5" />
                      )}
                      <span>Create invoice</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleExportPDF(selectedQuote, modalItems)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
