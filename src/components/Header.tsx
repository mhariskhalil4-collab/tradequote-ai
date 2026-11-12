import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, LogOut, Building2, User as UserIcon, LayoutDashboard, BookOpen, Users, FileText, Receipt, Calendar, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, workspace, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2 text-gray-900 group">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-blue-700 transition">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">TradeQuote AI</span>
          </Link>

          {user && (
            <nav className="flex items-center space-x-1 sm:space-x-2">
              <Link
                to="/dashboard"
                onClick={() => navigate('/dashboard')}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isCurrent('/dashboard')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/price-book"
                onClick={() => navigate('/price-book')}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isCurrent('/price-book')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                <span>Price Book</span>
              </Link>
              <Link
                to="/customers"
                onClick={() => navigate('/customers')}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isCurrent('/customers')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                <span>Customers</span>
              </Link>
              <Link
                to="/quotes"
                onClick={() => navigate('/quotes')}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  location.pathname.startsWith('/quote')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                <span>Quotes</span>
              </Link>
              <Link
                to="/invoices"
                onClick={() => navigate('/invoices')}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  location.pathname.startsWith('/invoice')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                <span>Invoices</span>
              </Link>
              <Link
                to="/jobs"
                onClick={() => navigate('/jobs')}
                className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  location.pathname.startsWith('/job')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                <span>Jobs</span>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {workspace && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  <span className="font-semibold text-gray-900 max-w-[130px] truncate">{workspace.business_name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] uppercase font-bold">
                    {workspace.trade_type}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                <span className="hidden lg:inline max-w-[140px] truncate">{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-red-600 transition"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/demo"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-md transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Demo</span>
              </Link>
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
