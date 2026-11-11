import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import type { Customer } from '../types/database';
import {
  fetchCustomers,
  fetchCustomerQuoteStats,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  seedSampleCustomers,
  type CustomerStats,
} from '../services/customerService';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  UserPlus,
  Sparkles,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { workspace, user, refreshWorkspace } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quoteStats, setQuoteStats] = useState<Record<string, CustomerStats>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const currencySymbol = useMemo(() => {
    switch (workspace?.currency) {
      case 'CAD':
        return 'C$';
      case 'GBP':
        return '£';
      case 'EUR':
        return '€';
      case 'AUD':
        return 'A$';
      case 'USD':
      default:
        return '$';
    }
  }, [workspace?.currency]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    let activeWorkspaceId = workspace?.id;

    // Fallback: If workspace not yet hydrated in context, query Supabase directly
    if (!activeWorkspaceId && user?.id) {
      try {
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (wsData?.id) {
          activeWorkspaceId = wsData.id;
          refreshWorkspace();
        }
      } catch (err) {
        console.warn('Workspace direct lookup:', err);
      }
    }

    if (activeWorkspaceId) {
      // Fetch customers and quote statistics in parallel
      const [custRes, statsRes] = await Promise.all([
        fetchCustomers(activeWorkspaceId),
        fetchCustomerQuoteStats(activeWorkspaceId),
      ]);

      if (custRes.error) {
        setError(custRes.error);
        setCustomers([]);
      } else {
        setCustomers(custRes.data || []);
      }

      setQuoteStats(statsRes.stats || {});
    } else {
      setCustomers([]);
    }

    setLoading(false);
  }, [workspace?.id, user?.id, refreshWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Seed sample customers
  const handleSeedCustomers = async () => {
    if (!workspace) return;
    setActionLoading(true);
    setError(null);

    const { count, error: seedErr } = await seedSampleCustomers(workspace.id);
    if (seedErr) {
      setError(`Failed to add sample customers: ${seedErr}`);
    } else {
      showNotification(`Added ${count} sample customers.`);
      await loadData();
    }
    setActionLoading(false);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormNotes(customer.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormError(null);
  };

  // Save (Create or Update)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Customer name is required.');
      return;
    }

    setActionLoading(true);

    if (editingCustomer) {
      // Update
      const { data, error: updateErr } = await updateCustomer(editingCustomer.id, workspace.id, {
        name: trimmedName,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
      });

      if (updateErr) {
        setFormError(updateErr);
        setActionLoading(false);
        return;
      }

      if (data) {
        setCustomers((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        showNotification(`Customer "${data.name}" updated successfully.`);
      }
    } else {
      // Create
      const { data, error: createErr } = await createCustomer({
        workspace_id: workspace.id,
        name: trimmedName,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
      });

      if (createErr) {
        setFormError(createErr);
        setActionLoading(false);
        return;
      }

      if (data) {
        setCustomers((prev) => [data, ...prev]);
        showNotification(`Customer "${data.name}" added successfully.`);
      }
    }

    setActionLoading(false);
    handleCloseModal();
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    if (!workspace || !deleteConfirmCustomer) return;
    setActionLoading(true);

    const { error: delErr } = await deleteCustomer(deleteConfirmCustomer.id, workspace.id);
    if (delErr) {
      setError(`Failed to delete customer: ${delErr}`);
    } else {
      setCustomers((prev) => prev.filter((c) => c.id !== deleteConfirmCustomer.id));
      showNotification(`Customer "${deleteConfirmCustomer.name}" removed.`);
    }

    setActionLoading(false);
    setDeleteConfirmCustomer(null);
  };

  // Search filter by name
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const q = searchQuery.toLowerCase();
      const matchesName = cust.name.toLowerCase().includes(q);
      const matchesEmail = cust.email && cust.email.toLowerCase().includes(q);
      const matchesPhone = cust.phone && cust.phone.toLowerCase().includes(q);
      return matchesName || matchesEmail || matchesPhone;
    });
  }, [customers, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Customers</h1>
                <p className="text-sm text-gray-500">
                  Manage client contact details, service addresses, and quote history for {workspace?.business_name}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {customers.length === 0 && (
              <button
                onClick={handleSeedCustomers}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 shadow-sm transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Sample Customers</span>
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between text-red-700 text-sm">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start justify-between text-green-700 text-sm">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers by name..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Total Customers: <strong className="text-gray-900">{customers.length}</strong>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No customers yet</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Add your trade customers to store their service addresses, track quotes, and speed up estimate creation.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Customer</span>
              </button>
              <button
                onClick={handleSeedCustomers}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Seed Sample Customers</span>
              </button>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          /* Search Empty State */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-gray-900">No matching customers</h4>
            <p className="text-sm text-gray-500 mt-1">
              No customers found matching &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              Clear Search
            </button>
          </div>
        ) : (
          /* Customers Table */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Customer Name
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Phone & Email
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Address
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Quotes
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Accepted Total
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Notes
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-sm">
                  {filteredCustomers.map((cust) => {
                    const stats = quoteStats[cust.id] || { quotesCount: 0, acceptedTotal: 0 };
                    return (
                      <tr key={cust.id} className="hover:bg-gray-50/80 transition">
                        {/* Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                              {cust.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{cust.name}</div>
                            </div>
                          </div>
                        </td>

                        {/* Phone & Email */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <div className="space-y-1">
                            {cust.phone ? (
                              <a
                                href={`tel:${cust.phone}`}
                                className="inline-flex items-center text-gray-700 hover:text-blue-600 transition"
                              >
                                <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                <span>{cust.phone}</span>
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">No phone</span>
                            )}
                            {cust.email && (
                              <div>
                                <a
                                  href={`mailto:${cust.email}`}
                                  className="inline-flex items-center text-gray-500 hover:text-blue-600 transition"
                                >
                                  <Mail className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                  <span className="max-w-[170px] truncate">{cust.email}</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Address */}
                        <td className="px-6 py-4 text-xs text-gray-600 max-w-xs">
                          {cust.address ? (
                            <div className="flex items-start space-x-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{cust.address}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>

                        {/* Read-Only: Quotes Count */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              stats.quotesCount > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            <FileText className="w-3 h-3 mr-1 opacity-70" />
                            <span>
                              {stats.quotesCount} {stats.quotesCount === 1 ? 'quote' : 'quotes'}
                            </span>
                          </span>
                        </td>

                        {/* Read-Only: Accepted Quotes Total */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                              stats.acceptedTotal > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            <DollarSign className="w-3 h-3 mr-0.5 opacity-70" />
                            <span>
                              {currencySymbol}
                              {stats.acceptedTotal.toFixed(2)}
                            </span>
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-6 py-4 text-xs text-gray-500 max-w-xs">
                          {cust.notes ? (
                            <span className="line-clamp-2" title={cust.notes}>
                              {cust.notes}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenEditModal(cust)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit customer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmCustomer(cust)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div>
                Showing <strong className="text-gray-900">{filteredCustomers.length}</strong> of{' '}
                <strong className="text-gray-900">{customers.length}</strong> customers
              </div>
              <div>Workspace ID: {workspace?.id?.slice(0, 8)}...</div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden transform transition-all animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCustomer}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="custName" className="block text-xs font-semibold text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="custName"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Doe / Apex Dental Clinic"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Phone & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="custPhone" className="block text-xs font-semibold text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="custPhone"
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="(555) 234-5678"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="custEmail" className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="custEmail"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="custAddress" className="block text-xs font-semibold text-gray-700 mb-1">
                    Service Address
                  </label>
                  <input
                    id="custAddress"
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="e.g. 123 Maple Street, Suite 200"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="custNotes" className="block text-xs font-semibold text-gray-700 mb-1">
                    Customer Notes
                  </label>
                  <textarea
                    id="custNotes"
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Gate code, HVAC unit brand, special maintenance requirements, etc."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : editingCustomer ? (
                    'Save Changes'
                  ) : (
                    'Add Customer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Customer</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to remove <strong className="text-gray-900">&quot;{deleteConfirmCustomer.name}&quot;</strong>? This will permanently delete the customer record.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmCustomer(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  'Delete Customer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
