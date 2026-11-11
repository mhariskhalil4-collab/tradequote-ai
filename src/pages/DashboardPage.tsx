import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import {
  Building2,
  FileText,
  BookOpen,
  Receipt,
  Briefcase,
  Users,
  Flame,
  Droplets,
  DollarSign,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { workspace, user } = useAuth();

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

            {/* Quick Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                <span>Currency: <strong className="text-gray-900">{workspace?.currency || 'USD'}</strong></span>
              </div>
              {workspace?.phone && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  <span>{workspace.phone}</span>
                </div>
              )}
              {workspace?.email && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <span>{workspace.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overview Stats Cards Placeholder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Quotes</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">0</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Invoices</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">0</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Scheduled Jobs</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">0</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Customers</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">0</p>
            </div>
          </div>
        </div>

        {/* Empty Dashboard State */}
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Welcome to {workspace?.business_name || 'TradeQuote AI'}
          </h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            Your {workspace?.trade_type || 'trade'} workspace is set up and ready. In upcoming phases, you&apos;ll be able to create instant quotes, manage customers, schedule jobs, and send invoices.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Price Book
            </span>
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Quotes
            </span>
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              <Receipt className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Invoices
            </span>
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Jobs
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
