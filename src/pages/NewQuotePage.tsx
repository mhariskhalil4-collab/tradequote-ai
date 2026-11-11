import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { fetchCustomers, seedSampleCustomers } from '../services/customerService';
import { fetchPriceBookItems, seedWorkspacePriceBook } from '../services/priceBookService';
import {
  createQuoteWithLines,
  draftQuoteWithAI,
  getNextQuoteNumber,
  type DraftLineItemInput,
} from '../services/quoteService';
import type { Customer, PriceBookItem } from '../types/database';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  User,
  Info,
} from 'lucide-react';

export const NewQuotePage: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [priceBookItems, setPriceBookItems] = useState<PriceBookItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [quoteNumber, setQuoteNumber] = useState<string>('TQ-1001');

  // Form states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [lineItems, setLineItems] = useState<DraftLineItemInput[]>([]);
  const [selectedPriceBookId, setSelectedPriceBookId] = useState<string>('');

  // Status & feedback states
  const [loading, setLoading] = useState<boolean>(true);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }

    const loadInitialData = async () => {
      setLoading(true);
      try {
        // 1. Fetch next quote number (e.g. TQ-1001)
        const nextNum = await getNextQuoteNumber(workspace.id);
        setQuoteNumber(nextNum);

        // 2. Load Customers (auto-seed if empty for great UX)
        let { data: custData } = await fetchCustomers(workspace.id);
        if (!custData || custData.length === 0) {
          await seedSampleCustomers(workspace.id);
          const res = await fetchCustomers(workspace.id);
          custData = res.data;
        }
        if (custData && custData.length > 0) {
          setCustomers(custData);
          setSelectedCustomerId(custData[0].id);
        }

        // 3. Load Price Book items (auto-seed if empty)
        let { data: pbData } = await fetchPriceBookItems(workspace.id);
        if (!pbData || pbData.length === 0) {
          await seedWorkspacePriceBook(workspace.id);
          const res = await fetchPriceBookItems(workspace.id);
          pbData = res.data;
        }
        if (pbData && pbData.length > 0) {
          setPriceBookItems(pbData);
        }
      } catch (err: unknown) {
        console.error('Error loading initial quote data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [workspace?.id]);

  // Selected customer object
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Financial calculations
  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.line_total) || 0), 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Add line item from price book
  const handleAddPriceBookItem = () => {
    if (!selectedPriceBookId) return;
    const item = priceBookItems.find((p) => p.id === selectedPriceBookId);
    if (!item) return;

    const newLine: DraftLineItemInput = {
      price_book_item_id: item.id,
      description: item.name,
      quantity: 1,
      unit: item.unit,
      unit_price: Number(item.unit_price) || 0,
      line_total: Number(item.unit_price) || 0,
    };

    setLineItems((prev) => [...prev, newLine]);
    setSelectedPriceBookId('');
  };

  // Add manual custom line item
  const handleAddCustomLine = () => {
    const newLine: DraftLineItemInput = {
      price_book_item_id: null,
      description: '',
      quantity: 1,
      unit: 'each',
      unit_price: 0,
      line_total: 0,
    };
    setLineItems((prev) => [...prev, newLine]);
  };

  // Update specific line item field
  const handleUpdateLine = (
    index: number,
    field: keyof DraftLineItemInput,
    value: string | number | null
  ) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'quantity') {
        const qty = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        target.quantity = qty;
        target.line_total = Math.round(qty * target.unit_price * 100) / 100;
      } else if (field === 'unit_price') {
        const price = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        target.unit_price = price;
        target.line_total = Math.round(target.quantity * price * 100) / 100;
      } else if (field === 'description') {
        target.description = String(value);
      } else if (field === 'unit') {
        target.unit = String(value);
      } else if (field === 'price_book_item_id') {
        target.price_book_item_id = value ? String(value) : null;
      }

      updated[index] = target;
      return updated;
    });
  };

  // Delete line item
  const handleDeleteLine = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // AI Quote Drafting handler
  const handleDraftWithAI = async () => {
    if (!description.trim()) {
      setErrorMsg('Please describe the job in plain words so AI can draft the quote.');
      return;
    }

    setErrorMsg(null);
    setAiNotice(null);
    setIsDrafting(true);

    try {
      const result = await draftQuoteWithAI({
        description: description.trim(),
        priceBookItems,
        tradeType: workspace?.trade_type || 'HVAC',
        customerName: selectedCustomer?.name,
      });

      if (result.line_items && result.line_items.length > 0) {
        setLineItems(result.line_items);
        if (result.title && (!title || title.trim() === '')) {
          setTitle(result.title);
        }
        if (result.notes) {
          setNotes(result.notes);
        }

        setAiNotice(
          result.source === 'gemini'
            ? `✨ Gemini AI drafted ${result.line_items.length} line items matching your Price Book!`
            : `✨ AI drafted ${result.line_items.length} line items from your job description & Price Book.`
        );
      } else {
        setErrorMsg('AI could not identify items for this description. Try adding specific keywords or items.');
      }
    } catch (err: unknown) {
      console.error('AI draft error:', err);
      setErrorMsg('Failed to generate AI draft. You can add items manually below.');
    } finally {
      setIsDrafting(false);
    }
  };

  // Save Quote to Supabase
  const handleSaveQuote = async () => {
    if (!workspace?.id) return;
    if (!selectedCustomerId) {
      setErrorMsg('Please select a customer for this quote.');
      return;
    }
    if (lineItems.length === 0) {
      setErrorMsg('Please add or draft at least one line item before saving.');
      return;
    }

    const hasEmptyDesc = lineItems.some((l) => !l.description || l.description.trim() === '');
    if (hasEmptyDesc) {
      setErrorMsg('All line items must have a description.');
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);

    try {
      const finalTitle = title.trim() || `${workspace.trade_type || 'HVAC'} Service - ${quoteNumber}`;
      const res = await createQuoteWithLines({
        workspaceId: workspace.id,
        customerId: selectedCustomerId,
        title: finalTitle,
        notes: notes.trim(),
        quoteNumber: quoteNumber,
        taxPercent: taxPercent,
        lineItems: lineItems,
      });

      if (res.error) {
        setErrorMsg(res.error);
        setIsSaving(false);
        return;
      }

      // Success -> navigate to Quotes list page
      navigate('/quotes', {
        state: { message: `Quote ${quoteNumber} successfully created!` },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save quote.';
      setErrorMsg(msg);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <Link
              to="/quotes"
              onClick={() => navigate('/quotes')}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition shadow-xs cursor-pointer"
              title="Back to Quotes"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  New Quote
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                  {quoteNumber}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Draft professional estimates using AI and your Price Book catalog
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/quotes"
              onClick={() => navigate('/quotes')}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition shadow-xs cursor-pointer"
            >
              Cancel
            </Link>
            <button
              onClick={handleSaveQuote}
              disabled={isSaving || lineItems.length === 0}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Quote ({quoteNumber})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-3 shadow-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 text-sm font-medium">{errorMsg}</div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-600 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* AI Success Banner */}
        {aiNotice && (
          <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start space-x-3 shadow-xs animate-in fade-in">
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-600" />
            <div className="flex-1 text-sm font-medium">{aiNotice}</div>
            <button
              onClick={() => setAiNotice(null)}
              className="text-purple-400 hover:text-purple-600 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading customer & price book details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Customer & Title Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>1. Select Customer & Title</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Picker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  {customers.length > 0 ? (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                      <span>No customers found.</span>
                      <Link
                        to="/customers"
                        className="font-bold underline text-amber-900"
                      >
                        Add Customers
                      </Link>
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                      {selectedCustomer.email && <span>✉️ {selectedCustomer.email}</span>}
                      {selectedCustomer.address && <span>📍 {selectedCustomer.address}</span>}
                    </div>
                  )}
                </div>

                {/* Quote Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Quote Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AC Diagnostic, Drain Flush & Gas Refill"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Leave blank to let AI auto-generate a descriptive title.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: AI Job Description & Instant Drafting */}
            <div className="bg-gradient-to-br from-purple-50/70 via-white to-blue-50/50 rounded-2xl border border-purple-200/80 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">
                    2. Describe Job in Plain Words & Draft with AI
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full inline-flex items-center">
                  Powered by Edge Function & Price Book
                </span>
              </div>

              <p className="text-xs text-gray-600 mb-3">
                Type what the client requested in natural English. Our AI analyzes the work and
                automatically constructs line items matching your Price Book prices.
              </p>

              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Customer's AC is not cooling properly in the master bedroom. Needs complete diagnostic, drain line chemical cleaning, 1 lb R32 gas refill, and replacement of old digital thermostat."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 shadow-2xs placeholder-gray-400"
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                    <Info className="w-3.5 h-3.5 text-purple-600" />
                    <span>Uses prices from your {priceBookItems.length} Price Book items</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDraftWithAI}
                    disabled={isDrafting || !description.trim()}
                    className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    {isDrafting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Drafting Quote with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Draft with AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Editable Line Items Table */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>3. Quote Line Items ({lineItems.length})</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Review and edit any description, quantity, or unit price below.
                  </p>
                </div>

                {/* Quick Add from Price Book or Custom */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedPriceBookId}
                    onChange={(e) => setSelectedPriceBookId(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select from Price Book...</option>
                    {priceBookItems.map((pb) => (
                      <option key={pb.id} value={pb.id}>
                        {pb.name} (${pb.unit_price}/{pb.unit})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddPriceBookItem}
                    disabled={!selectedPriceBookId}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed border border-blue-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddCustomLine}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Custom Line</span>
                  </button>
                </div>
              </div>

              {/* Line Items Table */}
              {lineItems.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No line items yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Type a description above and click &quot;Draft with AI&quot;, or add items from your
                    Price Book catalog.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-3 w-[45%]">Description</th>
                        <th className="py-3 px-3 w-[15%]">Qty</th>
                        <th className="py-3 px-3 w-[15%]">Unit</th>
                        <th className="py-3 px-3 w-[15%]">Unit Price ({workspace?.currency || '$'})</th>
                        <th className="py-3 px-3 w-[10%] text-right">Total</th>
                        <th className="py-3 px-2 w-[5%] text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/75 transition">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateLine(idx, 'description', e.target.value)}
                              placeholder="Line item description"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {item.price_book_item_id && (
                              <span className="inline-block text-[10px] text-blue-600 font-semibold mt-0.5">
                                • Price Book linked
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={item.unit}
                              onChange={(e) => handleUpdateLine(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="each">each</option>
                              <option value="hour">hour</option>
                              <option value="foot">foot</option>
                              <option value="job">job</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                $
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unit_price}
                                onChange={(e) =>
                                  handleUpdateLine(idx, 'unit_price', e.target.value)
                                }
                                className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900 text-xs">
                            ${(Number(item.line_total) || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(idx)}
                              className="p-1 rounded text-gray-400 hover:text-red-600 transition"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial Summary & Notes Grid */}
              <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Customer Notes & Scope of Work
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Work warranty, terms of payment, or additional details for the client..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">
                      ${subtotal.toFixed(2)} {workspace?.currency || 'USD'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center space-x-1.5">
                      <span>Tax</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 rounded border border-gray-300 text-[11px] text-right font-semibold"
                      />
                      <span>%</span>
                    </div>
                    <span className="font-semibold text-gray-900">${taxAmount.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Total Estimate</span>
                    <span className="text-lg font-extrabold text-blue-600">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <Link
                to="/quotes"
                onClick={() => navigate('/quotes')}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition shadow-xs cursor-pointer"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSaveQuote}
                disabled={isSaving || lineItems.length === 0}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Quote...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Quote as {quoteNumber}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
