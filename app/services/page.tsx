"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import { getCurrencySymbol } from "@/lib/constants";
import {
  Clock,
  DollarSign,
  Plus,
  Search,
  Users,
  Trash2,
  X,
  Pencil,
  Tag,
  Loader2,
  AlertCircle,
  FolderPlus,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  category_id: string;
  price: number;
  duration_minutes: number;
  description: string;
  staff: { id: string; name: string }[];
}

export default function ServicesPage() {
  const { business, subscription, settings } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Add Service Form States
  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState(45);
  const [newDescription, setNewDescription] = useState("");
  const [newStaffIds, setNewStaffIds] = useState<string[]>([]);

  // Category Form States
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Edit Service Form States
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState(45);
  const [editDescription, setEditDescription] = useState("");
  const [editStaffIds, setEditStaffIds] = useState<string[]>([]);

  interface ServiceDB {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
    description: string | null;
    category_id: string;
    staff_services: { staff: { id: string; name: string } | null }[] | null;
  }

  // Fetch initial services, categories, and staff rosters
  const fetchServicesData = React.useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch Categories
      const { data: catData } = await supabase
        .from("service_categories")
        .select("id, name")
        .eq("business_id", business.id)
        .order("name", { ascending: true });
      if (catData) {
        setCategories(catData);
        if (catData.length > 0) {
          setNewCategoryId(catData[0].id);
        }
      }

      // 2. Fetch Active Staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("name", { ascending: true });
      if (staffData) setStaffList(staffData);

      // 3. Fetch Services
      const { data: servData, error: servError } = await supabase
        .from("services")
        .select(`
          id,
          name,
          price,
          duration_minutes,
          description,
          category_id,
          staff_services(staff(id, name))
        `)
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("name", { ascending: true });

      if (servError) throw servError;

      if (servData) {
        const mapped: Service[] = (servData as unknown as ServiceDB[]).map((s) => {
          const staffArr = s.staff_services
            ?.map((rel) => rel.staff)
            .filter(Boolean) as { id: string; name: string }[] || [];

          return {
            id: s.id,
            name: s.name,
            category_id: s.category_id,
            price: Number(s.price),
            duration_minutes: s.duration_minutes,
            description: s.description || "No description provided.",
            staff: staffArr,
          };
        });
        setServices(mapped);
      }

    } catch (err) {
      console.error("Error loading services panel:", err);
      setErrorMsg("Failed to retrieve service roster catalogs.");
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active) {
        fetchServicesData();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchServicesData]);

  // Handle Add Category
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !newCategoryInput.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("service_categories")
        .insert([
          {
            business_id: business.id,
            name: newCategoryInput.trim(),
          },
        ])
        .select("id, name")
        .single();

      if (error) throw error;

      if (data) {
        setCategories([...categories, data]);
        setNewCategoryId(data.id);
        setNewCategoryInput("");
        setIsCategoryModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to add category.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !newName.trim() || !newPrice || !newCategoryId) return;
    setSaving(true);
    setErrorMsg(null);

    const maxServicesAllowed = subscription?.plans?.max_services || 10;
    if (services.length >= maxServicesAllowed) {
      setErrorMsg(`Plan Limit Reached: Your current plan only allows up to ${maxServicesAllowed} active services. Please upgrade your subscription tier.`);
      setSaving(false);
      return;
    }

    try {
      // 1. Insert service
      const { data: newService, error: serviceErr } = await supabase
        .from("services")
        .insert([
          {
            business_id: business.id,
            category_id: newCategoryId,
            name: newName.trim(),
            price: parseFloat(newPrice),
            duration_minutes: newDuration,
            description: newDescription.trim() || null,
            status: "active",
          },
        ])
        .select("id")
        .single();

      if (serviceErr) throw serviceErr;

      // 2. Insert staff mappings if staff is selected
      if (newService && newStaffIds.length > 0) {
        const mappings = newStaffIds.map((staffId) => ({
          business_id: business.id,
          service_id: newService.id,
          staff_id: staffId,
        }));

        const { error: mapErr } = await supabase
          .from("staff_services")
          .insert(mappings);

        if (mapErr) throw mapErr;
      }

      setIsModalOpen(false);
      // Reset form
      setNewName("");
      setNewPrice("");
      setNewDuration(45);
      setNewDescription("");
      setNewStaffIds([]);

      await fetchServicesData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to add service.");
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const handleStartEdit = (service: Service) => {
    setEditingService(service);
    setEditName(service.name);
    setEditCategoryId(service.category_id);
    setEditPrice(service.price.toString());
    setEditDuration(service.duration_minutes);
    setEditDescription(service.description);
    setEditStaffIds(service.staff.map((s) => s.id));
    setIsEditModalOpen(true);
  };

  // Handle Save Edit Service
  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !editingService || !editName.trim() || !editPrice || !editCategoryId) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      // 1. Update service
      const { error: serviceErr } = await supabase
        .from("services")
        .update({
          category_id: editCategoryId,
          name: editName.trim(),
          price: parseFloat(editPrice),
          duration_minutes: editDuration,
          description: editDescription.trim() || null,
        })
        .eq("id", editingService.id);

      if (serviceErr) throw serviceErr;

      // 2. Clear old staff mapping relations
      await supabase
        .from("staff_services")
        .delete()
        .eq("service_id", editingService.id);

      // 3. Re-insert new staff mapping relations
      if (editStaffIds.length > 0) {
        const mappings = editStaffIds.map((staffId) => ({
          business_id: business.id,
          service_id: editingService.id,
          staff_id: staffId,
        }));

        const { error: mapErr } = await supabase
          .from("staff_services")
          .insert(mappings);

        if (mapErr) throw mapErr;
      }

      setIsEditModalOpen(false);
      await fetchServicesData();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update service profile.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Service
  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchServicesData();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete service.");
    } finally {
      setSaving(false);
    }
  };

  // Helper checkbox state update
  const handleNewStaffCheckbox = (staffId: string) => {
    if (newStaffIds.includes(staffId)) {
      setNewStaffIds(newStaffIds.filter((id) => id !== staffId));
    } else {
      setNewStaffIds([...newStaffIds, staffId]);
    }
  };

  const handleEditStaffCheckbox = (staffId: string) => {
    if (editStaffIds.includes(staffId)) {
      setEditStaffIds(editStaffIds.filter((id) => id !== staffId));
    } else {
      setEditStaffIds([...editStaffIds, staffId]);
    }
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex min-h-screen w-full flex-col mt-4 font-sans">
      {/* Header toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Services & Categories</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Configure catalog offerings, durations, pricing, and associate staff specialists.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Tag className="size-4" /> Add Category
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={services.length >= (subscription?.plans?.max_services || 10)}
            className={`flex items-center gap-1 px-4.5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer shadow-lg ${
              services.length >= (subscription?.plans?.max_services || 10)
                ? "bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-[#0f294a] text-white hover:bg-slate-800 shadow-slate-900/10"
            }`}
          >
            <Plus className="size-4" /> Add Service
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Search Filter */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search service name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition"
        />
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-450">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-650 mb-2" />
          <span className="text-xs font-bold uppercase tracking-wider">Syncing database services...</span>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service) => {
            const catName = categories.find((c) => c.id === service.category_id)?.name || "General";
            return (
              <div
                key={service.id}
                className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_15px_30px_-20px_rgba(15,23,42,0.15)] flex flex-col justify-between hover:shadow-md transition duration-200"
              >
                <div>
                  {/* Category Name tag */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md text-slate-500">
                      {catName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(service)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-450 hover:text-slate-700 transition cursor-pointer"
                        aria-label="Edit Service"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        disabled={saving}
                        className="p-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                        aria-label="Delete Service"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-tight">{service.name}</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2 h-8">
                    {service.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 mt-4 pt-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs text-slate-655 font-semibold">
                    <div className="flex items-center gap-1">
                      <Clock className="size-4 text-slate-400" />
                      <span>{service.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="size-4 text-slate-400" />
                      <span className="text-sm font-extrabold text-slate-900">{getCurrencySymbol(settings?.currency)}{service.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Users className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {service.staff.length > 0
                        ? service.staff.map((s) => s.name.split(" ")[0]).join(", ")
                        : "No assigned specialists"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-200 rounded-[28px] bg-slate-50/20 select-none">
          <Clock className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-xs font-semibold text-slate-550">No service catalog items set up yet</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Click Add Service above to begin listing options.</p>
        </div>
      )}

      {/* Add Service Modal */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Plus className="text-indigo-650" /> Add Service Profile
            </h3>
            <p className="text-xs text-slate-550 mb-5">Create a listable service card detail for public bookings.</p>

            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balayage Consultation"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white focus:ring-4 focus:ring-slate-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Category</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Price ({getCurrencySymbol(settings?.currency)})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 75.00"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Description</label>
                <textarea
                  placeholder="Service description details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Specialists Roster</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/20">
                  {staffList.map((staff) => {
                    const isChecked = newStaffIds.includes(staff.id);
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => handleNewStaffCheckbox(staff.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          isChecked
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                        }`}
                      >
                        {staff.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 rounded-xl bg-[#0f294a] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-slate-900/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Service Catalog"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {isEditModalOpen && (
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <Pencil className="text-indigo-650 size-5" /> Edit Service Catalog
            </h3>
            <p className="text-xs text-slate-550 mb-5">Modify the selected service profile details.</p>

            <form onSubmit={handleSaveEditService} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Service Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white focus:ring-4 focus:ring-slate-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Price ({getCurrencySymbol(settings?.currency)})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={editDuration}
                  onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Specialists Roster</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/20">
                  {staffList.map((staff) => {
                    const isChecked = editStaffIds.includes(staff.id);
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => handleEditStaffCheckbox(staff.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          isChecked
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                        }`}
                      >
                        {staff.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 rounded-xl bg-[#0f294a] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-slate-900/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div
          onClick={() => setIsCategoryModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <FolderPlus className="text-indigo-650 size-5.5" /> Add Category
            </h3>
            <p className="text-xs text-slate-550 mb-5">Create a grouping category to classify services.</p>

            <form onSubmit={handleAddCategorySubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nails, Massage, Color"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 rounded-xl bg-[#0f294a] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-slate-900/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
