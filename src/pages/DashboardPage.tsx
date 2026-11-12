import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import {
  Building2,
  FileText,
  BookOpen,
  Users,
  Flame,
  Droplets,
  DollarSign,
  Phone,
  Mail,
  ArrowRight,
  Plus,
  Sparkles,
  Receipt,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { workspace, user } = useAuth();
  const navigate = useNavigate();
  const [priceBookCount, setPriceBookCount] = useState<number>(8);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [quoteCount, setQuoteCount] = useState<number>(0);
  const [invoiceCount, setInvoiceCount] = useState<number>(0);

  useEffect(() => {
    if (!workspace?.id) return;

    // Fetch Price Book Count
    supabase
      .from('price_book_items')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .then(({ count }) => {
        if (count !== null && count > 0) {
          setPriceBookCount(count);
        } else {
          setPriceBookCount(8);
        }
      });

    // Fetch Customers Count
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .then(({ count }) => {
        if (count !== null) {
          setCustomerCount(count);
        }
      });

    // Fetch Quotes Count
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .then(({ count }) => {
        if (count !== null) {
          setQuoteCount(count);
        }
      });

    // Fetch Invoices Count
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .then(({ count }) => {
        if (count !== null) {
          setInvoiceCount(count);
        }
      });
  }, [workspace?.id]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Hero Banner */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                {workspace?.business_name ? workspace.business_name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    {workspace?.business_name || 'TradeQuote AI Workspace'}
                  </h1>
                  {workspace?.trade_type && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {workspace.trade_type === 'HVAC' ? (
                        <Flame className="w-3 h-3 mr-1 text-orange-600" />
                      ) : (
                        <Droplets className="w-3 h-3 mr-1 text-blue-600" />
                      )}
                      {workspace.trade_type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Owner: {user?.email}
                </p>
              </div>
            </div>

            {/* Quick Actions & Meta */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <Link
                to="/quotes/new"
                onClick={() => navigate('/quotes/new')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                title="Draft New Quote with AI"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Quote</span>
              </Link>
              <Link
                to="/quotes"
                onClick={() => navigate('/quotes')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Go to Quotes"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Quotes</span>
              </Link>
              <Link
                to="/invoices"
                onClick={() => navigate('/invoices')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Go to Invoices"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </Link>
              <Link
                to="/price-book"
                onClick={() => navigate('/price-book')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Go to Price Book"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Price Book</span>
              </Link>
              <Link
                to="/customers"
                onClick={() => navigate('/customers')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Go to Customers"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Customers</span>
              </Link>

              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                <span>Currency: <strong className="text-gray-900">{workspace?.currency || 'USD'}</strong></span>
              </div>
              {workspace?.phone && (
                <div className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  <span>{workspace.phone}</span>
                </div>
              )}
              {workspace?.email && (
                <div className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <span>{workspace.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overview Active Modules: 4 Active Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Quotes Card */}
          <Link
            to="/quotes"
            onClick={() => navigate('/quotes')}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Quotes</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{quoteCount}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 group-hover:translate-x-0.5 transition">
              <span>View</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </div>
          </Link>

          {/* Invoices Card */}
          <Link
            to="/invoices"
            onClick={() => navigate('/invoices')}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Invoices</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{invoiceCount}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition">
              <span>View</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </div>
          </Link>

          {/* Price Book Card */}
          <Link
            to="/price-book"
            onClick={() => navigate('/price-book')}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-blue-500 hover:shadow-md transition group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Price Book Items</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{priceBookCount}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition">
              <span>View</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </div>
          </Link>

          {/* Customers Card */}
          <Link
            to="/customers"
            onClick={() => navigate('/customers')}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-purple-500 hover:shadow-md transition group flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Customers</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{customerCount}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-semibold text-purple-600 group-hover:translate-x-0.5 transition">
              <span>View</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </div>
          </Link>
        </div>

        {/* Dashboard Actions / Modules State */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Welcome to {workspace?.business_name || 'TradeQuote AI'}
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Your {workspace?.trade_type || 'trade'} workspace is set up. Draft AI-powered quotes with line items from your Price Book, track approvals, and manage client details.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/quotes/new"
              onClick={() => navigate('/quotes/new')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Draft New Quote</span>
            </Link>
            <Link
              to="/quotes"
              onClick={() => navigate('/quotes')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition cursor-pointer"
            >
              <FileText className="w-4 h-4 mr-2 text-emerald-600" />
              <span>Quotes ({quoteCount})</span>
            </Link>
            <Link
              to="/invoices"
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition cursor-pointer"
            >
              <Receipt className="w-4 h-4 mr-2 text-indigo-600" />
              <span>Invoices ({invoiceCount})</span>
            </Link>
            <Link
              to="/price-book"
              onClick={() => navigate('/price-book')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
              <span>Price Book</span>
            </Link>
            <Link
              to="/customers"
              onClick={() => navigate('/customers')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition cursor-pointer"
            >
              <Users className="w-4 h-4 mr-2 text-purple-600" />
              <span>Customers ({customerCount})</span>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/quotes"
              onClick={() => navigate('/quotes')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Quotes ({quoteCount})
            </Link>
            <Link
              to="/invoices"
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-xs cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Invoices ({invoiceCount})
            </Link>
            <Link
              to="/quotes/new"
              onClick={() => navigate('/quotes/new')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              New Quote
            </Link>
            <Link
              to="/price-book"
              onClick={() => navigate('/price-book')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Price Book
            </Link>
            <Link
              to="/customers"
              onClick={() => navigate('/customers')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition shadow-xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
              Customers
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
