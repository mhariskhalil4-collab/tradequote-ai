import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, LogOut, Building2, User as UserIcon } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, workspace, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 text-gray-900 group">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-blue-700 transition">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">TradeQuote AI</span>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {workspace && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  <span className="font-semibold text-gray-900">{workspace.business_name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] uppercase font-bold">
                    {workspace.trade_type}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                <span className="hidden md:inline max-w-[150px] truncate">{user.email}</span>
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
