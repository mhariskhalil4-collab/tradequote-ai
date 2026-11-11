import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { SignUpPage } from './pages/SignUpPage';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { PriceBookPage } from './pages/PriceBookPage';
import { CustomersPage } from './pages/CustomersPage';
import { QuotesPage } from './pages/QuotesPage';
import { NewQuotePage } from './pages/NewQuotePage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignUpPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <SetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireWorkspace>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/price-book"
            element={
              <ProtectedRoute>
                <PriceBookPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricebook"
            element={
              <ProtectedRoute>
                <PriceBookPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer"
            element={<Navigate to="/customers" replace />}
          />
          <Route
            path="/quotes"
            element={
              <ProtectedRoute>
                <QuotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotes/new"
            element={
              <ProtectedRoute>
                <NewQuotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quote/new"
            element={<Navigate to="/quotes/new" replace />}
          />
          <Route
            path="/new-quote"
            element={<Navigate to="/quotes/new" replace />}
          />
          <Route
            path="/quote"
            element={<Navigate to="/quotes" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
