import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import type { TradeType } from '../types/database';
import { seedWorkspacePriceBook } from '../services/priceBookService';
import { Building2, Loader2, AlertCircle, Flame, Droplets, Check } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
];

export const SetupPage: React.FC = () => {
  const { user, workspace, refreshWorkspace, tableUnavailable } = useAuth();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [tradeType, setTradeType] = useState<TradeType>('HVAC');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user already has a workspace, redirect to dashboard
  useEffect(() => {
    if (workspace) {
      navigate('/dashboard', { replace: true });
    }
  }, [workspace, navigate]);

  // Pre-fill email from auth user
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be logged in to create a workspace.');
      return;
    }

    if (!businessName.trim()) {
      setError('Please provide a business name.');
      return;
    }

    setLoading(true);

    try {
      const { data: newWorkspace, error: insertError } = await supabase
        .from('workspaces')
        .insert({
          owner_id: user.id,
          business_name: businessName.trim(),
          trade_type: tradeType,
          phone: phone.trim() || null,
          email: email.trim() || null,
          currency,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === 'PGRST205' || insertError.message.includes('schema cache')) {
          setError(
            'The "workspaces" table has not been created in Supabase yet. Please run supabase/schema.sql in your Supabase SQL Editor.'
          );
        } else {
          setError(insertError.message);
        }
        setLoading(false);
        return;
      }

      // Automatically seed the price book with 8 sample HVAC items for the new workspace
      if (newWorkspace?.id) {
        try {
          await seedWorkspacePriceBook(newWorkspace.id);
        } catch (seedErr) {
          console.warn('Initial seed note:', seedErr);
        }
      }

      await refreshWorkspace();
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Set Up Your Workspace
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tell us about your trade business so we can configure your quotes and price books.
          </p>
        </div>

        {tableUnavailable && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Database Schema Required</p>
                <p className="mt-1">
                  The database tables have not been created in Supabase yet. Please run the SQL schema located in{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">supabase/schema.sql</code> in your Supabase project&apos;s SQL Editor.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200 sm:px-10">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700">
                Business Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="businessName"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Heating & Cooling"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Trade Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Trade Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTradeType('HVAC')}
                  className={`p-4 rounded-xl border-2 text-left flex items-start space-x-3 transition ${
                    tradeType === 'HVAC'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      tradeType === 'HVAC' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Flame className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">HVAC</span>
                      {tradeType === 'HVAC' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Heating, Ventilation & Air Conditioning</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTradeType('Plumbing')}
                  className={`p-4 rounded-xl border-2 text-left flex items-start space-x-3 transition ${
                    tradeType === 'Plumbing'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      tradeType === 'Plumbing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Plumbing</span>
                      {tradeType === 'Plumbing' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Residential & Commercial Plumbing</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Phone & Email Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Business Phone
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 234-5678"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="workspaceEmail" className="block text-sm font-medium text-gray-700">
                  Business Email
                </label>
                <div className="mt-1">
                  <input
                    id="workspaceEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@business.com"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-sm font-semibold text-gray-700">
                Default Currency
              </label>
              <div className="mt-1">
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating workspace...
                  </span>
                ) : (
                  'Complete Setup & Enter Dashboard'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

