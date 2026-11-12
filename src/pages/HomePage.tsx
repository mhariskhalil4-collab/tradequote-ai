import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { Wrench, ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, workspace, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to={workspace ? '/dashboard' : '/setup'} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl w-full text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>AI-Powered Quotes for HVAC & Plumbing Contractors</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
            TradeQuote AI
          </h1>

          <p className="mt-4 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Create professional contractor estimates, manage jobs, and send instant invoices in seconds. Built specifically for tradespeople.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              to="/demo"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 border border-amber-300 rounded-xl shadow-sm text-base font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 transition"
            >
              <Sparkles className="w-4 h-4 mr-2 text-amber-600" />
              <span>Explore Live Demo</span>
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 border border-gray-300 rounded-xl shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Sign In
            </Link>
          </div>

          {/* Value Props */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Instant Quote Builder</h3>
              <p className="text-sm text-gray-500 mt-1">
                Fast price books tailored for HVAC and Plumbing with standard line items.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Secure Multi-Tenant RLS</h3>
              <p className="text-sm text-gray-500 mt-1">
                Workspace isolation enforced at the database layer with Supabase Row Level Security.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Trade-First Workflow</h3>
              <p className="text-sm text-gray-500 mt-1">
                Designed for speed on the job site from phone or desktop.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

