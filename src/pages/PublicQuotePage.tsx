import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchPublicQuote,
  respondToPublicQuote,
  type PublicQuoteData,
} from '../services/quoteService';
import type { QuoteStatus } from '../types/database';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Wrench,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Send,
} from 'lucide-react';

export const PublicQuotePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [quote, setQuote] = useState<PublicQuoteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('No quote share token provided.');
      setLoading(false);
      return;
    }

    const loadQuote = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data, error } = await fetchPublicQuote(token);
        if (error || !data) {
          setErrorMsg(error || 'This quote could not be found or has an invalid share token.');
        } else {
          setQuote(data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load quote.';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [token]);

  const handleDecision = async (decision: 'accept' | 'decline') => {
    if (!token || !quote) return;

    const confirmMsg =
      decision === 'accept'
        ? `Are you sure you want to ACCEPT quote ${quote.quote_number} for $${quote.total.toFixed(2)}?`
        : `Are you sure you want to DECLINE quote ${quote.quote_number}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(decision);
    setFeedbackNotice(null);

    try {
      const res = await respondToPublicQuote(token, decision);
      if (res.error) {
        setFeedbackNotice({ type: 'error', text: res.error });
      } else {
        const newStatus: QuoteStatus = res.status;
        setQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
        setFeedbackNotice({
          type: 'success',
          text:
            decision === 'accept'
              ? 'Thank you! You have accepted this quote. The contractor has been notified and will be in touch with next steps.'
              : 'You have declined this quote. Thank you for letting the contractor know.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${decision} quote.`;
      setFeedbackNotice({ type: 'error', text: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const renderStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accepted</span>
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Declined</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Awaiting Approval</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
            <Clock className="w-3.5 h-3.5 text-gray-600" />
            <span>Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Public Top Navbar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              TradeQuote AI
            </span>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Official Customer Estimate Portal
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-gray-900">Loading Quote Estimate...</h2>
            <p className="text-xs text-gray-500 mt-1">
              Retrieving quote details from contractor edge service...
            </p>
          </div>
        ) : errorMsg || !quote ? (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Quote Not Available</h2>
            <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
              {errorMsg || 'We could not find a quote matching this link. It may have expired or been removed.'}
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Return to TradeQuote AI
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Expiration Notice Banner */}
            {quote.is_expired && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">This quote link has expired. </span>
                  The validity period concluded on{' '}
                  <span className="font-semibold">
                    {quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'N/A'}
                  </span>
                  . Please contact your contractor if you would like a refreshed estimate.
                </div>
              </div>
            )}

            {/* Action Feedback Banner */}
            {feedbackNotice && (
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 shadow-xs animate-in fade-in ${
                  feedbackNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {feedbackNotice.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                )}
                <div className="text-xs sm:text-sm font-semibold">{feedbackNotice.text}</div>
              </div>
            )}

            {/* Quote Container Paper */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header Details */}
              <div className="p-6 sm:p-8 border-b border-gray-200 bg-gradient-to-br from-gray-50/75 via-white to-blue-50/20">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-sm font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {quote.quote_number}
                      </span>
                      {renderStatusBadge(quote.status)}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-2.5">
                      {quote.title}
                    </h1>
                    {quote.workspace?.business_name && (
                      <p className="text-sm font-semibold text-gray-600 mt-1 flex items-center space-x-1.5">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>Prepared by {quote.workspace.business_name}</span>
                        {quote.workspace.trade_type && (
                          <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full ml-1">
                            {quote.workspace.trade_type}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right space-y-1 text-xs text-gray-500">
                    <p className="flex items-center sm:justify-end space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        Date:{' '}
                        <strong className="text-gray-800 font-medium">
                          {new Date(quote.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                    </p>
                    {quote.expires_at && (
                      <p className="flex items-center sm:justify-end space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          Valid until:{' '}
                          <strong className="text-gray-800 font-medium">
                            {new Date(quote.expires_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </strong>
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Details Pill */}
                <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                  <div>
                    <div className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>Estimate For</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {quote.customer?.name || 'Customer'}
                    </p>
                    {quote.customer?.address && (
                      <p className="text-gray-500 mt-0.5">{quote.customer.address}</p>
                    )}
                  </div>

                  <div className="text-left sm:text-right text-gray-600 space-y-0.5">
                    {quote.customer?.phone && <p>📞 {quote.customer.phone}</p>}
                    {quote.customer?.email && <p>✉️ {quote.customer.email}</p>}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="p-6 sm:p-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">
                  Scope of Work & Line Items
                </h3>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 w-[50%]">Item Description</th>
                        <th className="py-3 px-4 text-center w-[15%]">Quantity</th>
                        <th className="py-3 px-4 text-center w-[15%]">Unit</th>
                        <th className="py-3 px-4 text-right w-[20%]">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {quote.line_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                              {item.description}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                              ${Number(item.unit_price).toFixed(2)} / {item.unit}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center text-xs font-semibold text-gray-700">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-gray-500">
                            {item.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900 text-xs sm:text-sm font-mono">
                            ${Number(item.line_total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes & Financial Summary */}
                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div>
                    {quote.notes && (
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">
                          Terms & Additional Information
                        </span>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {quote.notes}
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-gray-500">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>All work is backed by contractor quality guarantee.</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900 font-mono">
                        ${quote.subtotal.toFixed(2)}
                      </span>
                    </div>

                    {quote.tax_percent > 0 && (
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Tax ({quote.tax_percent}%)</span>
                        <span className="font-semibold text-gray-900 font-mono">
                          ${((quote.subtotal * quote.tax_percent) / 100).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-sm sm:text-base">
                      <span className="font-extrabold text-gray-900">Total Estimate</span>
                      <span className="font-extrabold text-blue-600 text-lg sm:text-xl font-mono">
                        ${quote.total.toFixed(2)} {quote.workspace?.currency || 'USD'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accept & Decline Actions Footer */}
              {!quote.is_expired && quote.status !== 'accepted' && quote.status !== 'declined' && (
                <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-xs text-gray-600">
                    <p className="font-bold text-gray-900">Ready to proceed with this work?</p>
                    <p className="mt-0.5">
                      Accept to notify your contractor and lock in this estimate.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => handleDecision('decline')}
                      disabled={actionLoading !== null}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50 transition shadow-xs cursor-pointer"
                    >
                      {actionLoading === 'decline' ? (
                        <span className="inline-flex items-center space-x-1.5">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Declining...</span>
                        </span>
                      ) : (
                        <span>Decline Quote</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision('accept')}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-md hover:shadow-lg cursor-pointer"
                    >
                      {actionLoading === 'accept' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Accepting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Quote (${quote.total.toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* If already accepted or declined, show clear banner */}
              {quote.status === 'accepted' && (
                <div className="p-6 bg-emerald-50 border-t border-emerald-200 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-base font-bold text-emerald-900">
                    Quote Accepted
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                    This estimate has been approved. The contractor has logged your confirmation.
                  </p>
                </div>
              )}

              {quote.status === 'declined' && (
                <div className="p-6 bg-red-50 border-t border-red-200 text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h4 className="text-base font-bold text-red-900">
                    Quote Declined
                  </h4>
                  <p className="text-xs text-red-700 mt-1 max-w-md mx-auto">
                    This quote was marked as declined. Contact your contractor if you need an adjusted proposal.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
