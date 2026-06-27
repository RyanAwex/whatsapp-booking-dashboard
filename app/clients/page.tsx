"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import {
  Search,
  ChevronDown,
  Plus,
  Phone,
  Mail,
  Calendar,
  X,
  Loader2,
  Trash2,
  AlertCircle,
  FileText,
  User,
  PlusCircle,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  tag: "VIP" | "New" | "Loyal";
  phone: string;
  email: string;
  notes: string;
  totalVisits: number;
  noShows: number;
  totalSpent: number;
  lastVisit: string;
  avatarInitials: string;
}

export default function ClientsPage() {
  const { business } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Add Client Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTag, setNewTag] = useState<"New" | "VIP" | "Loyal">("New");
  const [newNotes, setNewNotes] = useState("");

  // Edit Client states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTag, setEditTag] = useState<"New" | "VIP" | "Loyal">("New");
  const [editNotes, setEditNotes] = useState("");

  interface ClientDB {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    tag: string | null;
    notes: string | null;
    appointments: { start_time: string; status: string }[] | null;
    sales: { amount: number; status: string }[] | null;
  }

  // Fetch clients
  const fetchClients = React.useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          name,
          phone,
          email,
          tag,
          notes,
          appointments(start_time, status),
          sales(amount, status)
        `)
        .eq("business_id", business.id)
        .order("name", { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: Client[] = (data as unknown as ClientDB[]).map((c) => {
          const completedAppts = c.appointments?.filter((a) => a.status === "completed") || [];
          const noShowAppts = c.appointments?.filter((a) => a.status === "no_show") || [];
          
          const totalSpent = c.sales
            ?.filter((s) => s.status === "paid")
            .reduce((sum: number, s) => sum + Number(s.amount), 0) || 0;

          // Find latest completed appointment date
          let lastVisit = "No visits yet";
          if (completedAppts.length > 0) {
            const latestDate = new Date(Math.max(...completedAppts.map((a) => new Date(a.start_time).getTime())));
            lastVisit = latestDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }

          const initials = c.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "CL";

          return {
            id: c.id,
            name: c.name,
            tag: (c.tag || "New") as "VIP" | "New" | "Loyal",
            phone: c.phone || "No phone number",
            email: c.email || "No email address",
            notes: c.notes || "No client notes written yet.",
            totalVisits: completedAppts.length,
            noShows: noShowAppts.length,
            totalSpent,
            lastVisit,
            avatarInitials: initials,
          };
        });

        setClients(mapped);

        // Keep active selection in sync
        setSelectedClient((prev) => {
          if (!prev) return null;
          return mapped.find((m) => m.id === prev.id) || null;
        });
      }
    } catch (err) {
      console.error("Error loading CRM clients:", err);
      setErrorMsg("Failed to retrieve client directory.");
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active) {
        fetchClients();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchClients]);

  // Handle Add Client submit
  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !newName.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("clients")
        .insert([
          {
            business_id: business.id,
            name: newName.trim(),
            phone: newPhone.trim() || null,
            email: newEmail.trim() || null,
            tag: newTag,
            notes: newNotes.trim() || null,
          },
        ]);

      if (error) throw error;

      setIsAddModalOpen(false);
      // Reset form
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewTag("New");
      setNewNotes("");

      await fetchClients();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to add new client profile.");
    } finally {
      setSaving(false);
    }
  };

  // Trigger Edit mode
  const handleStartEdit = () => {
    if (!selectedClient) return;
    setEditName(selectedClient.name);
    setEditPhone(selectedClient.phone === "No phone number" ? "" : selectedClient.phone);
    setEditEmail(selectedClient.email === "No email address" ? "" : selectedClient.email);
    setEditTag(selectedClient.tag);
    setEditNotes(selectedClient.notes === "No client notes written yet." ? "" : selectedClient.notes);
    setIsEditMode(true);
  };

  // Save Edit Client profile
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editName.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
          tag: editTag,
          notes: editNotes.trim() || null,
        })
        .eq("id", selectedClient.id);

      if (error) throw error;

      setIsEditMode(false);
      await fetchClients();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Client profile
  const handleDeleteClient = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client's profile? This will cancel all their appointments.")) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSelectedClient(null);
      await fetchClients();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete client profile.");
    } finally {
      setSaving(false);
    }
  };

  // Filtering lists
  const filteredClients = clients.filter((c) => {
    const searchMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const tagMatch = tagFilter === "all" || c.tag === tagFilter;
    return searchMatch && tagMatch;
  });

  return (
    <main className="flex min-h-screen w-full flex-col mt-4 font-sans">
      {/* Title & Toolbar */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clients CRM</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Manage your customer database, check visit logs, and track spent metrics.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#0f294a] text-white px-4.5 py-2.5 text-xs font-semibold hover:bg-slate-800 transition hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-[#0f294a]/10"
        >
          <Plus className="size-4" /> Add Client
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* List card (col-span-2) */}
        <div className="lg:col-span-2 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur min-h-[500px]">
          {/* Controls list */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clients by name, phone or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition"
              />
            </div>

            <div className="relative">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-9 py-2 text-xs font-semibold text-slate-750 shadow-sm outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="all">All Classifications</option>
                <option value="VIP">VIP Clients</option>
                <option value="Loyal">Loyal Clients</option>
                <option value="New">New Clients</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>

          {/* CRM Roster Grid */}
          <div className="h-[460px] overflow-auto scrollbar pr-1">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-450">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Syncing database...</span>
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="space-y-3">
                {filteredClients.map((client) => {
                  const isSelected = selectedClient?.id === client.id;
                  const tagColors = {
                    VIP: "bg-amber-50 border-amber-100 text-amber-700",
                    Loyal: "bg-indigo-50 border-indigo-100 text-indigo-700",
                    New: "bg-emerald-50 border-emerald-100 text-emerald-700",
                  };
                  return (
                    <div
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setIsEditMode(false);
                      }}
                      className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer transition duration-200 ${
                        isSelected
                          ? "bg-slate-50 border-indigo-650 shadow-sm"
                          : "border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md">
                          {client.avatarInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 leading-none">{client.name}</h4>
                            <span className={`text-[8px] font-bold uppercase tracking-wider border px-1.5 py-0.5 rounded-md ${tagColors[client.tag]}`}>
                              {client.tag}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1 font-medium">
                            <Phone className="size-3" /> {client.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-slate-650 font-semibold pr-2">
                        <div className="text-center">
                          <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">Visits</span>
                          {client.totalVisits}
                        </div>
                        <div className="text-center">
                          <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">Spent</span>
                          ${client.totalSpent.toFixed(2)}
                        </div>
                        <div className="text-center">
                          <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">Last Visit</span>
                          {client.lastVisit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 border border-dashed border-slate-205 rounded-3xl bg-slate-50/20 select-none">
                <Search className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-505">No matching clients found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Try searching another query or add a client manually.</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Client details (col-span-1) */}
        <div className="lg:col-span-1 flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.22)] backdrop-blur min-h-[500px] h-full justify-between">
          {selectedClient ? (
            isEditMode ? (
              // EDIT MODE FORM
              <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                    <h3 className="text-base font-bold text-slate-900">Edit Profile</h3>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="size-7 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 transition"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Tag</label>
                      <select
                        value={editTag}
                        onChange={(e) => setEditTag(e.target.value as "VIP" | "New" | "Loyal")}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition"
                      >
                        <option value="New">New</option>
                        <option value="VIP">VIP</option>
                        <option value="Loyal">Loyal</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Special Instructions</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-750 transition flex items-center justify-center gap-1.5"
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save Profile"}
                  </button>
                </div>
              </form>
            ) : (
              // READ-ONLY INFO VIEW
              <div className="flex-1 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-lg font-semibold text-slate-900">Client Profile</h2>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="flex size-7 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Header Row */}
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 mt-4 shadow-sm">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm select-none shadow-md">
                      {selectedClient.avatarInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-slate-900 truncate">{selectedClient.name}</h3>
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md mt-0.5">
                        {selectedClient.tag} Tier
                      </span>
                    </div>
                  </div>

                  {/* Contact cards info */}
                  <div className="mt-5 space-y-4 text-xs font-medium text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <Phone className="size-4 text-slate-400 shrink-0" />
                      <span>{selectedClient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Mail className="size-4 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedClient.email}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Calendar className="size-4 text-slate-400 shrink-0" />
                      <span>Last Visit: {selectedClient.lastVisit}</span>
                    </div>
                  </div>

                  {/* Stats list */}
                  <div className="grid grid-cols-3 gap-3 border-y border-slate-100 py-4 my-5 text-center text-xs font-semibold text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">Completed</span>
                      {selectedClient.totalVisits}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">No-Shows</span>
                      {selectedClient.noShows}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-medium uppercase tracking-wider">Total Spent</span>
                      ${selectedClient.totalSpent.toFixed(2)}
                    </div>
                  </div>

                  {/* Profile Actions */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={handleStartEdit}
                      className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 cursor-pointer"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => handleDeleteClient(selectedClient.id)}
                      disabled={saving}
                      className="rounded-xl border border-rose-200 bg-rose-50/20 text-rose-700 py-2.5 text-xs font-bold hover:bg-rose-50 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="size-3.5 shrink-0" /> Delete Client
                    </button>
                  </div>

                  {/* Notes Card */}
                  <div className="border-t border-slate-100 mt-5 pt-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 select-none">
                      <FileText className="size-3" /> Special CRM Notes
                    </h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                      {selectedClient.notes}
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto select-none">
              <User className="size-10 text-slate-300 stroke-[1.5] mb-3 animate-pulse" />
              <h3 className="font-bold text-slate-800 text-sm">No Client Selected</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-44 leading-relaxed">
                Select a client from the database ledger list to inspect spent history, tags, and custom CRM instruction notes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <PlusCircle className="text-indigo-650" /> Add Client Profile
            </h3>
            <p className="text-xs text-slate-550 mb-5">Create a client record inside your CRM directory database.</p>

            <form onSubmit={handleAddClientSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Thompson"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white focus:ring-4 focus:ring-slate-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. (555) 123-4567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-455 focus:bg-white focus:ring-4 focus:ring-slate-100 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Tag Tier</label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value as "VIP" | "New" | "Loyal")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-455 focus:bg-white focus:ring-4 focus:ring-slate-100 transition cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="VIP">VIP</option>
                    <option value="Loyal">Loyal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="liam@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white focus:ring-4 focus:ring-slate-100 transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Special Instructions</label>
                <textarea
                  placeholder="Prefers ash hair toners, books every Tuesday morning..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white focus:ring-4 focus:ring-slate-100 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 rounded-xl bg-[#0f294a] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-slate-900/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Client Profile"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
