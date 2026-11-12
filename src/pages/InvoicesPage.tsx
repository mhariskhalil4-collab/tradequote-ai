import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import {
  fetchInvoices,
  createCheckoutSession,
  verifyCheckoutSession,
  updateInvoiceStatus,
  type InvoiceWithCustomer,
} from '../services/invoiceService';
import { exportInvoicePDF } from '../utils/pdfGenerator';
import type { InvoiceStatus, QuoteLineItem } from '../types/database';
import {
  Receipt,
  Search,
  ExternalLink,
  Copy,
  Check,
  FileDown,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  X,
  CreditCard,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  // Actions loading
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Selected Modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCustomer | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Fetch Invoices
  const loadInvoices = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await fetchInvoices(workspace.id);
      if (error && (!data || data.length === 0)) {
        setErrorMsg(error);
      } else if (data) {
        setInvoices(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load invoices:', err);
      setErrorMsg('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Handle return from Stripe Checkout (?session_id=...&paid=true)
  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (sessionId && workspace?.id) {
      const verifyReturn = async () => {
        try {
          const { paid } = await verifyCheckoutSession(sessionId);
          if (paid) {
            setSuccessBanner('Payment successful! Your invoice status has automatically updated to Paid.');
            // Refresh invoices
            const { data } = await fetchInvoices(workspace.id);
            if (data) {
              setInvoices(data);
            }
          }
        } catch (err) {
          console.warn('Verify return error:', err);
        } finally {
          // Clean up search params
          setSearchParams({});
        }
      };
      verifyReturn();
    }
  }, [searchParams, workspace?.id, setSearchParams]);

  // Periodic polling for unpaid invoices with stripe_session_id to auto-update when paid
  useEffect(() => {
    if (!workspace?.id) return;

    const interval = setInterval(async () => {
      const pendingInvoices = invoices.filter(
        (inv) => inv.status === 'unpaid' && inv.stripe_session_id
      );

      for (const inv of pendingInvoices) {
        if (!inv.stripe_session_id) continue;
        try {
          const { paid, payment_intent } = await verifyCheckoutSession(
            inv.stripe_session_id,
            inv.id
          );
          if (paid) {
            await updateInvoiceStatus(inv.id, workspace.id, 'paid', payment_intent);
            setInvoices((prev) =>
              prev.map((i) =>
                i.id === inv.id
                  ? {
                      ...i,
                      status: 'paid',
                      paid_at: new Date().toISOString(),
                      stripe_payment_id: payment_intent || null,
                    }
                  : i
              )
            );
            setSuccessBanner(`Invoice ${inv.invoice_number} was just paid in Stripe! Updated to Paid.`);
          }
        } catch {}
      }
    }, 4000); // Check every 4 seconds

    return () => clearInterval(interval);
  }, [invoices, workspace?.id]);

  // Create checkout or open payment link
  const handlePayOrOpenLink = async (invoice: InvoiceWithCustomer) => {
    if (invoice.stripe_checkout_url) {
      window.open(invoice.stripe_checkout_url, '_blank');
      return;
    }

    setCheckoutLoadingId(invoice.id);
    setErrorMsg(null);
    try {
      const { url, session_id, error } = await createCheckoutSession(invoice);
      if (error || !url) {
        setErrorMsg(error || 'Failed to create Stripe payment link.');
      } else {
        // Update state
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === invoice.id
              ? { ...i, stripe_checkout_url: url, stripe_session_id: session_id }
              : i
          )
        );
        window.open(url, '_blank');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating checkout session.');
    } finally {
      setCheckoutLoadingId(null);
    }
  };

  // Copy payment link
  const handleCopyPaymentLink = async (invoice: InvoiceWithCustomer) => {
    setErrorMsg(null);
    let checkoutUrl = invoice.stripe_checkout_url;

    if (!checkoutUrl) {
      setCheckoutLoadingId(invoice.id);
      try {
        const { url, session_id, error } = await createCheckoutSession(invoice);
        if (error || !url) {
          setErrorMsg(error || 'Failed to generate payment link.');
          setCheckoutLoadingId(null);
          return;
        }
        checkoutUrl = url;
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === invoice.id
              ? { ...i, stripe_checkout_url: url, stripe_session_id: session_id }
              : i
          )
        );
      } catch (err) {
        setErrorMsg('Failed to generate payment link.');
        setCheckoutLoadingId(null);
        return;
      } finally {
        setCheckoutLoadingId(null);
      }
    }

    if (checkoutUrl) {
      try {
        await navigator.clipboard.writeText(checkoutUrl);
        setCopiedInvoiceId(invoice.id);
        setTimeout(() => setCopiedInvoiceId(null), 3000);
        setSuccessBanner(`Payment link for ${invoice.invoice_number} copied to clipboard!`);
      } catch {
        setErrorMsg('Could not copy link to clipboard.');
      }
    }
  };

  // Export PDF
  const handleExportPDF = (invoice: InvoiceWithCustomer) => {
    exportInvoicePDF(invoice, workspace, invoice.line_items || []);
  };

  // Manual Check Payment Status
  const handleCheckStatus = async (invoice: InvoiceWithCustomer) => {
    if (!invoice.stripe_session_id || !workspace?.id) return;
    setVerifyingId(invoice.id);
    try {
      const { paid, payment_intent, error } = await verifyCheckoutSession(
        invoice.stripe_session_id,
        invoice.id
      );
      if (paid) {
        await updateInvoiceStatus(invoice.id, workspace.id, 'paid', payment_intent);
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === invoice.id
              ? {
                  ...i,
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  stripe_payment_id: payment_intent || null,
                }
              : i
          )
        );
        setSuccessBanner(`Payment confirmed! Invoice ${invoice.invoice_number} is now Paid.`);
      } else {
        alert(error || `Invoice ${invoice.invoice_number} is still unpaid in Stripe.`);
      }
    } finally {
      setVerifyingId(null);
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer?.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Totals
  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const paidTotal = paidInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const unpaidInvoices = invoices.filter((i) => i.status === 'unpaid');
  const unpaidTotal = unpaidInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);

  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
            Paid
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 mr-1" />
            Unpaid
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5 text-red-600 mr-1" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
              <span>TradeQuote AI</span>
              <span>/</span>
              <span className="text-gray-900 font-semibold">Invoices</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center space-x-2.5">
              <Receipt className="w-7 h-7 text-indigo-600" />
              <span>Invoices & Billing</span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/quotes')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <span>View Quotes</span>
            </button>
            <button
              onClick={loadInvoices}
              className="p-2 rounded-xl border border-gray-300 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition cursor-pointer"
              title="Refresh Invoices"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs sm:text-sm animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${totalInvoiced.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{invoices.length} invoices generated</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Collected / Paid</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                ${paidTotal.toFixed(2)}
              </p>
              <p className="text-xs text-emerald-600/80 mt-0.5">{paidInvoices.length} paid invoices</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unpaid / Outstanding</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                ${unpaidTotal.toFixed(2)}
              </p>
              <p className="text-xs text-amber-600/80 mt-0.5">{unpaidInvoices.length} pending payment</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Controls: Search & Status Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center space-x-2">
            {(['all', 'unpaid', 'paid', 'overdue'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No invoices found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {invoices.length === 0
                ? 'When a customer accepts an estimate, click "Create invoice" on that quote to generate an invoice and collect payment.'
                : 'No invoices match your search filters.'}
            </p>
            {invoices.length === 0 && (
              <button
                onClick={() => navigate('/quotes')}
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Go to Quotes</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Dates</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition">
                      {/* Invoice # */}
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {inv.invoice_number}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">
                          {inv.customer?.name || 'Customer'}
                        </div>
                        {inv.customer?.email && (
                          <div className="text-[11px] text-gray-400">{inv.customer.email}</div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                        <div>Created: {new Date(inv.created_at).toLocaleDateString()}</div>
                        {inv.due_date && (
                          <div className="text-[11px] text-gray-400">
                            Due: {new Date(inv.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(inv.status)}
                        {inv.status === 'paid' && inv.paid_at && (
                          <div className="text-[10px] text-emerald-700 mt-0.5">
                            {new Date(inv.paid_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-gray-900 font-mono whitespace-nowrap">
                        ${Number(inv.amount).toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5">
                          {/* Pay online / Stripe button */}
                          {inv.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => handlePayOrOpenLink(inv)}
                              disabled={checkoutLoadingId === inv.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition cursor-pointer"
                              title="Open Stripe Checkout payment link"
                            >
                              {checkoutLoadingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5" />
                              )}
                              <span>Pay</span>
                            </button>
                          )}

                          {/* Copy Payment Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyPaymentLink(inv)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              copiedInvoiceId === inv.id
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-indigo-600'
                            }`}
                            title={copiedInvoiceId === inv.id ? 'Copied!' : 'Copy payment link'}
                          >
                            {copiedInvoiceId === inv.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Export PDF Button */}
                          <button
                            type="button"
                            onClick={() => handleExportPDF(inv)}
                            className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Download PDF Invoice"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          {/* Check Status (if unpaid with session) */}
                          {inv.status === 'unpaid' && inv.stripe_session_id && (
                            <button
                              type="button"
                              onClick={() => handleCheckStatus(inv)}
                              disabled={verifyingId === inv.id}
                              className="p-1.5 rounded-lg bg-white border border-gray-200 text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              title="Check Stripe payment status"
                            >
                              {verifyingId === inv.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* View Invoice Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition cursor-pointer"
                            title="View invoice details"
                          >
                            <Eye className="w-4 h-4" />
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

        {/* Invoice Detail Modal */}
        {showModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95">
              {/* Modal Header */}
              <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-indigo-700 text-sm">
                        {selectedInvoice.invoice_number}
                      </span>
                      {renderStatusBadge(selectedInvoice.status)}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Created on {new Date(selectedInvoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
                {/* Customer Details */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Billed To
                  </span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {selectedInvoice.customer?.name || 'Customer'}
                  </p>
                  {selectedInvoice.customer?.address && (
                    <p className="text-gray-500 mt-0.5">{selectedInvoice.customer.address}</p>
                  )}
                  <div className="text-gray-600 mt-1 flex flex-wrap gap-3">
                    {selectedInvoice.customer?.phone && <span>📞 {selectedInvoice.customer.phone}</span>}
                    {selectedInvoice.customer?.email && <span>✉️ {selectedInvoice.customer.email}</span>}
                  </div>
                </div>

                {/* Payment Link Box */}
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span>Stripe Payment Link</span>
                    </span>
                    {selectedInvoice.status === 'paid' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Paid in Full
                      </span>
                    )}
                  </div>

                  {selectedInvoice.stripe_checkout_url ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={selectedInvoice.stripe_checkout_url}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white font-mono text-[11px] text-gray-800 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyPaymentLink(selectedInvoice)}
                          className="px-3 py-1.5 rounded-lg text-white font-bold bg-indigo-600 hover:bg-indigo-700 transition"
                        >
                          {copiedInvoiceId === selectedInvoice.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      {selectedInvoice.status !== 'paid' && (
                        <a
                          href={selectedInvoice.stripe_checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-800 font-semibold underline"
                        >
                          <span>Open Stripe Checkout page in new tab</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">No payment link created yet.</span>
                      <button
                        type="button"
                        onClick={() => handlePayOrOpenLink(selectedInvoice)}
                        disabled={checkoutLoadingId === selectedInvoice.id}
                        className="px-3 py-1.5 rounded-lg text-white font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {checkoutLoadingId === selectedInvoice.id ? 'Creating...' : 'Create Payment Link'}
                      </button>
                    </div>
                  )}

                  {selectedInvoice.stripe_payment_id && (
                    <p className="text-[10px] text-gray-500 font-mono">
                      Stripe Payment Reference: {selectedInvoice.stripe_payment_id}
                    </p>
                  )}
                </div>

                {/* Line Items */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Line Items
                  </h4>
                  {(!selectedInvoice.line_items || selectedInvoice.line_items.length === 0) ? (
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-500 text-center">
                      Services as quoted ({selectedInvoice.invoice_number}) — ${Number(selectedInvoice.amount).toFixed(2)}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                          <tr>
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-3 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Price</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedInvoice.line_items.map((item: QuoteLineItem, idx: number) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 text-gray-900 font-medium">{item.description}</td>
                              <td className="py-2 px-3 text-center text-gray-600">{item.quantity} {item.unit}</td>
                              <td className="py-2 px-3 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold">${Number(item.line_total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-gray-900">Total Invoice Amount</span>
                  <span className="font-extrabold text-indigo-700 text-base font-mono">
                    ${Number(selectedInvoice.amount).toFixed(2)} {workspace?.currency || 'USD'}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleExportPDF(selectedInvoice)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-blue-600" />
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
        )}
      </main>
    </div>
  );
};
