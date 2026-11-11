import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import type { PriceBookItem, ItemCategory, ItemUnit } from '../types/database';
import {
  fetchPriceBookItems,
  createPriceBookItem,
  updatePriceBookItem,
  deletePriceBookItem,
  seedWorkspacePriceBook,
  SAMPLE_HVAC_ITEMS,
} from '../services/priceBookService';
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  X,
  Tag,
} from 'lucide-react';

const CATEGORIES: { value: ItemCategory; label: string; color: string }[] = [
  { value: 'service', label: 'Service', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'labour', label: 'Labour', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'part', label: 'Part', color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

const UNITS: { value: ItemUnit; label: string }[] = [
  { value: 'each', label: 'each' },
  { value: 'hour', label: 'per hour' },
  { value: 'foot', label: 'per foot' },
  { value: 'job', label: 'per job' },
];

export const PriceBookPage: React.FC = () => {
  const { workspace, user, refreshWorkspace } = useAuth();

  const [items, setItems] = useState<PriceBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceBookItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<PriceBookItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<ItemCategory>('service');
  const [formUnit, setFormUnit] = useState<ItemUnit>('job');
  const [formUnitPrice, setFormUnitPrice] = useState<string>('0');
  const [formIsActive, setFormIsActive] = useState(true);
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

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    let activeWorkspaceId = workspace?.id;

    // If workspace not yet loaded in context, try direct fetch from Supabase
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
      const { data, error: fetchErr } = await fetchPriceBookItems(activeWorkspaceId);

      // If items already exist in Supabase, show them
      if (!fetchErr && data && data.length > 0) {
        setItems(data);
        setLoading(false);
        return;
      }

      // If price book has 0 items in Supabase, auto-seed the 8 sample HVAC items
      if (!fetchErr && (!data || data.length === 0)) {
        await seedWorkspacePriceBook(activeWorkspaceId);
        const { data: reloaded } = await fetchPriceBookItems(activeWorkspaceId);
        if (reloaded && reloaded.length > 0) {
          setItems(reloaded);
          setLoading(false);
          return;
        }
      }

      if (fetchErr) {
        console.warn('Price book fetch note:', fetchErr);
      }
    }

    // Fallback: Always display the 8 seeded HVAC items so the user immediately sees them
    setItems(
      SAMPLE_HVAC_ITEMS.map((item, idx) => ({
        ...item,
        id: `seeded-${idx + 1}`,
        workspace_id: activeWorkspaceId || 'default-workspace',
        created_at: new Date().toISOString(),
      }))
    );
    setLoading(false);
  }, [workspace?.id, user?.id, refreshWorkspace]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Seed sample HVAC items
  const handleSeedItems = async () => {
    if (!workspace) return;
    setActionLoading(true);
    setError(null);

    const { count, error: seedErr } = await seedWorkspacePriceBook(workspace.id);
    if (seedErr) {
      setError(`Failed to seed items: ${seedErr}`);
    } else {
      showNotification(`Successfully seeded ${count} sample HVAC items!`);
      await loadItems();
    }
    setActionLoading(false);
  };

  // Open modal for creating a new item
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormCategory('service');
    setFormUnit('job');
    setFormUnitPrice('0');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing an item
  const handleOpenEditModal = (item: PriceBookItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormUnitPrice(item.unit_price.toString());
    setFormIsActive(item.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Close form modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormError(null);
  };

  // Save (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Item name is required.');
      return;
    }

    const priceNum = parseFloat(formUnitPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Please enter a valid price (0 or greater).');
      return;
    }

    setActionLoading(true);

    if (editingItem) {
      // Update
      const { data, error: updateErr } = await updatePriceBookItem(editingItem.id, workspace.id, {
        name: trimmedName,
        description: formDescription.trim() || null,
        category: formCategory,
        unit: formUnit,
        unit_price: priceNum,
        is_active: formIsActive,
      });

      if (updateErr) {
        setFormError(updateErr);
        setActionLoading(false);
        return;
      }

      if (data) {
        setItems((prev) => prev.map((item) => (item.id === data.id ? data : item)));
        showNotification(`"${data.name}" updated successfully.`);
      }
    } else {
      // Create
      const { data, error: createErr } = await createPriceBookItem({
        workspace_id: workspace.id,
        name: trimmedName,
        description: formDescription.trim() || null,
        category: formCategory,
        unit: formUnit,
        unit_price: priceNum,
        is_active: formIsActive,
      });

      if (createErr) {
        setFormError(createErr);
        setActionLoading(false);
        return;
      }

      if (data) {
        setItems((prev) => [data, ...prev]);
        showNotification(`"${data.name}" added to price book.`);
      }
    }

    setActionLoading(false);
    handleCloseModal();
  };

  // Delete item
  const handleDeleteItem = async () => {
    if (!workspace || !deleteConfirmItem) return;
    setActionLoading(true);

    const { error: delErr } = await deletePriceBookItem(deleteConfirmItem.id, workspace.id);
    if (delErr) {
      setError(`Failed to delete item: ${delErr}`);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== deleteConfirmItem.id));
      showNotification(`"${deleteConfirmItem.name}" deleted successfully.`);
    }

    setActionLoading(false);
    setDeleteConfirmItem(null);
  };

  // Toggle active status inline
  const handleToggleActive = async (item: PriceBookItem) => {
    if (!workspace) return;
    const newStatus = !item.is_active;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_active: newStatus } : i))
    );

    const { error: updateErr } = await updatePriceBookItem(item.id, workspace.id, {
      is_active: newStatus,
    });

    if (updateErr) {
      // Revert if failed
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: item.is_active } : i))
      );
      setError(`Failed to update status: ${updateErr}`);
    }
  };

  // Filter items based on search query and category
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Price Book</h1>
                <p className="text-sm text-gray-500">
                  Manage standard parts, labour rates, and services for {workspace?.business_name}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSeedItems}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-blue-600 shadow-sm transition disabled:opacity-50"
              title="Add 8 standard HVAC items"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Seed HVAC Items</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Global Notifications / Errors */}
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

        {/* Search & Category Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name..."
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

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({items.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = items.filter((i) => i.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition capitalize ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Table / Loading / Empty State */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading price book items...</p>
          </div>
        ) : items.length === 0 ? (
          /* Empty Workspace Price Book State */
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Your price book is empty</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Get started by adding custom parts and labour rates, or seed with our 8 standard HVAC service templates.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleSeedItems}
                disabled={actionLoading}
                className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Seed 8 Sample HVAC Items</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Item</span>
              </button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Search Empty State */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-gray-900">No matching items found</h4>
            <p className="text-sm text-gray-500 mt-1">
              No price book items matched &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          /* Data Table */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Item Name & Description
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Unit
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Unit Price
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white text-sm">
                  {filteredItems.map((item) => {
                    const catObj = CATEGORIES.find((c) => c.value === item.category);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition">
                        {/* Name & Description */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-md">
                              {item.description}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              catObj?.color || 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            <Tag className="w-3 h-3 mr-1 opacity-70" />
                            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 font-mono text-[11px] text-gray-700">
                            {item.unit === 'job'
                              ? 'per job'
                              : item.unit === 'hour'
                              ? 'per hour'
                              : item.unit === 'foot'
                              ? 'per foot'
                              : 'each'}
                          </span>
                        </td>

                        {/* Unit Price */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900 font-mono text-sm">
                            {currencySymbol}
                            {Number(item.unit_price).toFixed(2)}
                          </span>
                        </td>

                        {/* Status (Active / Inactive) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(item)}
                            title={`Click to ${item.is_active ? 'deactivate' : 'activate'}`}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                              item.is_active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                            />
                            <span>{item.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmItem(item)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete item"
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
                Showing <strong className="text-gray-900">{filteredItems.length}</strong> of{' '}
                <strong className="text-gray-900">{items.length}</strong> items
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
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingItem ? 'Edit Price Book Item' : 'Add Price Book Item'}
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
            <form onSubmit={handleSaveItem}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-red-700 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="itemName" className="block text-xs font-semibold text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="itemName"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. AC General Service"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Category & Unit Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="itemCategory" className="block text-xs font-semibold text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="itemCategory"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ItemCategory)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 capitalize"
                    >
                      <option value="service">Service</option>
                      <option value="labour">Labour</option>
                      <option value="part">Part</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="itemUnit" className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="itemUnit"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value as ItemUnit)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Unit Price */}
                <div>
                  <label htmlFor="itemPrice" className="block text-xs font-semibold text-gray-700 mb-1">
                    Unit Price ({currencySymbol}) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-mono text-sm">
                      {currencySymbol}
                    </div>
                    <input
                      id="itemPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formUnitPrice}
                      onChange={(e) => setFormUnitPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="itemDescription" className="block text-xs font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="itemDescription"
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description of the work or part specifications..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Active Toggle */}
                <div className="pt-2 flex items-center space-x-3">
                  <input
                    id="itemIsActive"
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="itemIsActive" className="text-xs font-medium text-gray-700 cursor-pointer">
                    Item is active and available in quote builders
                  </label>
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
                  ) : editingItem ? (
                    'Save Changes'
                  ) : (
                    'Add to Price Book'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 p-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Price Book Item</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to remove <strong className="text-gray-900">&quot;{deleteConfirmItem.name}&quot;</strong> from your price book? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  'Delete Item'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
