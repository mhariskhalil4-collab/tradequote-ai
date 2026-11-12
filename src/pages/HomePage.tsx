import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import {
  Wrench,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileText,
  BookOpen,
  AlertTriangle,
  Repeat,
  ExternalLink,
  Send,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, workspace, loading } = useAuth();

  // If already authenticated and not loading, redirect to dashboard or setup
  if (!loading && user) {
    return <Navigate to={workspace ? '/dashboard' : '/setup'} replace />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <Header />

      {/* --------------------------------------------------------------------- */}
      {/* 1. HERO SECTION                                                       */}
      {/* --------------------------------------------------------------------- */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-28 bg-gradient-to-b from-blue-50/70 via-white to-gray-50/50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold mb-6 shadow-xs animate-in fade-in">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>AI-Powered Contractor Software for Modern Trade Businesses</span>
            </div>

            {/* REQUIRED HEADLINE */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15] sm:leading-[1.12]">
              Quotes to paid invoices — built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">HVAC and plumbing pros</span>.
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Stop losing jobs to slow text messages. Turn job notes into professional estimates in seconds, get instant customer sign-offs via link, and collect payment through Stripe before packing up your tools.
            </p>

            {/* Call to Actions */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md sm:max-w-none mx-auto">
              {/* PRIMARY REQUIRED BUTTON: Big Try Live Demo Button */}
              <Link
                to="/demo"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center space-x-2.5 px-7 py-3.5 rounded-xl text-base font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-amber-900" />
                <span>Try the live demo — no sign-up</span>
              </Link>

              {/* Sign Up Button */}
              <Link
                to="/signup"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Login Button */}
              <Link
                to="/login"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center px-5 py-3.5 rounded-xl text-base font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
              >
                Sign In
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-500 font-medium">
              ⚡ Free interactive HVAC demo • No credit card required • Instant customer accept page preview
            </p>
          </div>

          {/* Interactive Hero Visual Preview (HVAC Sample Data) */}
          <div className="mt-12 sm:mt-16 max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200/90 shadow-xl overflow-hidden">
            {/* Top Bar of Sample App Preview */}
            <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 font-mono text-gray-400 text-[11px]">CoolAir HVAC Services • Public Preview</span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Quote Accepted & Paid
              </span>
            </div>

            {/* Sample Quote Card Visual */}
            <div className="p-5 sm:p-7 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-600 text-sm">TQ-1001</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                      Accepted
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                    AC Gas Refill & Commercial Rooftop Maintenance
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: <strong className="text-gray-800">Oakridge Dental Clinic</strong> (1200 Commercial Way, Suite 4B)
                  </p>
                </div>

                <div className="sm:text-right">
                  <div className="text-xs text-gray-500">Total Approved</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-mono">$165.00</div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Invoice INV-1001 Paid via Stripe</div>
                </div>
              </div>

              {/* Sample Line Items Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100 text-[11px] uppercase font-bold">
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Unit Price</th>
                      <th className="py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-700">
                    <tr>
                      <td className="py-2.5 font-medium text-gray-900">AC General Service (Indoor/outdoor coil check & drain clean)</td>
                      <td className="py-2.5 text-center">1 job</td>
                      <td className="py-2.5 text-right">$45.00</td>
                      <td className="py-2.5 text-right font-bold text-gray-900">$45.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-gray-900">AC Gas Refill R32 (Vacuum pressure check & refrigerant charge)</td>
                      <td className="py-2.5 text-center">1 job</td>
                      <td className="py-2.5 text-right">$120.00</td>
                      <td className="py-2.5 text-right font-bold text-gray-900">$120.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Live Preview Actions Bar */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Customer accepted with 1 tap via shareable web link</span>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Link
                    to="/demo/quotes"
                    className="w-full sm:w-auto text-center px-3.5 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition"
                  >
                    View in Demo
                  </Link>
                  <a
                    href="/q/demo-coolair-quote-sent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-1 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                  >
                    <span>Open Accept Page</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 2. THE PROBLEM SECTION                                                */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-red-600 tracking-wider uppercase bg-red-100/70 px-3 py-1 rounded-full">
              The Costly Reality for Trades
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mt-3 tracking-tight">
              Slow quotes on WhatsApp lose jobs every single week.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
              When a customer needs their AC running or a burst pipe repaired, the job doesn&apos;t go to the best tradesperson — it goes to whoever gets a clear, trustworthy quote in their hands first.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <div className="bg-white rounded-2xl border border-red-200 p-6 sm:p-8 shadow-xs relative">
              <div className="flex items-center space-x-2 text-red-600 mb-4">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">The Old Way (Slow & Messy)</h3>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-gray-600">
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✕</span>
                  <span><strong>Jotting notes on paper:</strong> Scribbling part numbers and hours in a notebook on the truck dashboard.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✕</span>
                  <span><strong>Texting messy WhatsApp messages:</strong> Sending informal lump-sum estimates 8 hours later after you get home.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✕</span>
                  <span><strong>Competitor gets the job:</strong> Another contractor sends an instant professional breakdown while you&apos;re still driving.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✕</span>
                  <span><strong>Chasing payments for weeks:</strong> Sending manual bank transfer details and making awkward payment follow-up calls.</span>
                </li>
              </ul>
            </div>

            {/* The TradeQuote AI Way */}
            <div className="bg-gradient-to-br from-blue-50/50 via-white to-emerald-50/40 rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-xs relative">
              <div className="flex items-center space-x-2 text-emerald-700 mb-4">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-bold text-gray-900">The TradeQuote AI Way</h3>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-gray-700">
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span><strong>Instant AI Draft on site:</strong> Type or dictate &quot;AC gas refill & check coils&quot; — Gemini AI builds itemized lines in 3 seconds.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span><strong>1-Tap Customer Acceptance:</strong> Customer opens a branded link on their phone, reviews the price, and taps &quot;Accept Quote&quot;.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span><strong>1-Click Stripe Checkout:</strong> Convert accepted quotes into paid invoices instantly with credit card payments on file.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span><strong>Repeat Revenue Autopilot:</strong> Recurring HVAC service plans auto-book the next visit the moment you complete the job.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 3. THE 4 STEPS SECTION                                                */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-100/70 px-3 py-1 rounded-full">
              Seamless Contractor Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mt-3 tracking-tight">
              4 simple steps from first inspection to money in your bank.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-gray-600">
              Designed specifically for trade professionals who work in the field and need zero friction.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1: Price Book */}
            <div className="bg-gray-50/70 rounded-2xl p-6 border border-gray-200 flex flex-col justify-between hover:border-blue-400 hover:bg-white hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                    1
                  </div>
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Custom Price Book</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Store standard prices for parts, labour, and services. Pre-loaded with standard HVAC templates: AC service, R32 refrigerant gas, copper piping, and compressor diagnostics.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-semibold text-blue-700">
                ✓ No more guessing prices on the fly
              </div>
            </div>

            {/* Step 2: AI Quote Draft */}
            <div className="bg-gray-50/70 rounded-2xl p-6 border border-gray-200 flex flex-col justify-between hover:border-purple-400 hover:bg-white hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                    2
                  </div>
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">AI Quote Draft</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Describe the job in conversational English: &quot;compressor noise diagnostic and replace thermostat.&quot; Gemini AI matches your price book, calculates totals, and drafts the estimate in 3 seconds.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-semibold text-purple-700">
                ✓ 60-second estimate turnaround on site
              </div>
            </div>

            {/* Step 3: Customer Accepts by Link */}
            <div className="bg-gray-50/70 rounded-2xl p-6 border border-gray-200 flex flex-col justify-between hover:border-emerald-400 hover:bg-white hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                    3
                  </div>
                  <Send className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Customer Accepts by Link</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Send a clean, mobile-optimized public quote link over WhatsApp or SMS. Your customer reviews line items and taps &quot;Accept Quote&quot; with zero login or app install needed.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-semibold text-emerald-700">
                ✓ Instant digital sign-off from any phone
              </div>
            </div>

            {/* Step 4: Invoice Paid by Stripe */}
            <div className="bg-gray-50/70 rounded-2xl p-6 border border-gray-200 flex flex-col justify-between hover:border-indigo-400 hover:bg-white hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                    4
                  </div>
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Invoice Paid by Stripe</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
                  1-click converts the accepted quote into an invoice with payment link. Customers pay securely online via credit card. Webhooks automatically flip the invoice status to Paid.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-gray-200/70 text-xs font-semibold text-indigo-700">
                ✓ Automated credit card payouts to your bank
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 4. RECURRING JOB SCHEDULING SECTION                                    */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-bold text-amber-700 tracking-wider uppercase bg-amber-100 px-3 py-1 rounded-full">
                Phase 7 Automated Scheduling
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mt-3 tracking-tight">
                Turn one-off service calls into predictable recurring revenue.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                HVAC filters need changing every 3 months. Condensate lines and AC coils need pre-summer service every 6 months. TradeQuote AI automates your maintenance calendar so you never lose a client to neglect.
              </p>

              <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold flex-shrink-0">
                    <Repeat className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-gray-900">Auto-recurring engine:</strong> When a recurring job is marked &quot;Done&quot;, the next appointment is automatically created (e.g. current date + 6 months) for that customer.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-gray-900">Due This Week radar:</strong> Top priority appointments for the current week (Monday through Sunday) appear right at the top of your dashboard.
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-gray-900">1-click quote drafting:</strong> Arrived at the job and found extra repairs needed? Click &quot;Create quote&quot; directly from the job card with the customer pre-selected.
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/demo/jobs"
                  className="min-h-[44px] inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-xs"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Explore Demo Calendar</span>
                </Link>
                <Link
                  to="/signup"
                  className="min-h-[44px] inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                >
                  <span>Start Scheduling</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Recurring Job Mock Card Visual */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-gray-900 text-sm">Scheduled Maintenance Plan</span>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  Repeats Every 6 Months
                </span>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Due This Week</div>
                <div className="text-base font-bold text-gray-900 mt-1">Bi-Annual Rooftop AC Preventative Maintenance</div>
                <div className="text-xs text-gray-600 mt-1">Oakridge Dental Clinic • 1200 Commercial Way</div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-amber-200/60">
                  <span className="text-gray-500">Auto-reschedules on completion</span>
                  <span className="font-mono font-bold text-emerald-700">Scheduled</span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-gray-900">Quarterly Filter & Coil Inspection</div>
                    <div className="text-gray-500">Summit Fitness Club (Downtown Gym)</div>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                    Every 3 mos
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-gray-900">Emergency Condensate Drain Pump</div>
                    <div className="text-gray-500">Elena Rostova</div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 5. INTERACTIVE LIVE DEMO SHOWCASE SECTION                              */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-amber-400 text-amber-950 font-extrabold text-xs uppercase tracking-wider rounded-full mb-4">
                No Sign-Up or Credit Card Needed
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                Try the full contractor app right now in read-only demo mode.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-amber-100 leading-relaxed">
                Explore <strong className="text-white">CoolAir HVAC Services</strong> pre-seeded with:
                the 8-item sample HVAC price book, 5 realistic commercial & residential customers, 6 quotes with live statuses, 2 invoices with Stripe checkout links, and 4 scheduled jobs.
              </p>

              {/* REQUIRED BIG DEMO BUTTON */}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Link
                  to="/demo"
                  className="min-h-[48px] inline-flex items-center justify-center space-x-2 px-8 py-3.5 bg-white hover:bg-amber-50 text-amber-950 font-extrabold rounded-xl text-base shadow-md transition cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-amber-700" />
                  <span>Try the live demo — no sign-up</span>
                </Link>

                <a
                  href="/q/demo-coolair-quote-sent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-amber-800/80 hover:bg-amber-800 text-white font-bold rounded-xl text-sm border border-amber-400/40 transition"
                >
                  <span>Test Customer Accept Page</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 6. FINAL CALL TO ACTION / FOOTER SECTION                              */}
      {/* --------------------------------------------------------------------- */}
      <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-gray-800">
            <div>
              <div className="flex items-center space-x-2.5 text-white">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-tight">TradeQuote AI</span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-md">
                Fast estimates, instant customer approvals, and effortless Stripe billing built specifically for HVAC, plumbing, and trade businesses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/demo"
                className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs sm:text-sm transition"
              >
                Try the live demo — no sign-up
              </Link>
              <Link
                to="/login"
                className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs sm:text-sm transition"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition"
              >
                Create Free Account
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <p>© {new Date().getFullYear()} TradeQuote AI. All rights reserved.</p>
            <div className="flex items-center space-x-6">
              <span>Multi-tenant Row Level Security</span>
              <span>Stripe Checkout Verified</span>
              <span>Deno Edge Functions</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
