"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import { getCurrencySymbol } from "@/lib/constants";
import {
  Search,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  Plus,
  Loader2,
  AlertCircle,
  X,
  PlusCircle,
} from "lucide-react";

interface Transaction {
  id: string;
  clientName: string;
  service: string;
  staff: string;
  date: string;
  amount: number;
  method: "Card" | "Cash" | "Apple Pay";
  status: "Paid" | "Pending" | "Refunded" | "Cancelled";
  invoiceNumber: string;
}

export default function SalesPage() {
  const { business, settings } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);
  const [servicesList, setServicesList] = useState<{ id: string; name: string; price: number }[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Record Sale Form States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [inputAmount, setInputAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "online">("card");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");

  interface SaleDB {
    id: string;
    invoice_number: string | null;
    payment_method: string;
    status: string;
    amount: number;
    created_at: string;
    clients: { name: string } | null;
    services: { name: string } | null;
    staff: { name: string } | null;
  }

  // Fetch sales records
  const fetchSalesData = React.useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Sync past-ended appointments to the sales table before loading
      await supabase.rpc("sync_ended_appointments", { p_business_id: business.id });

      // 1. Fetch Clients for dropdown
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("business_id", business.id)
        .order("name", { ascending: true });
      if (clients) setClientsList(clients);

      // 2. Fetch Services for dropdown
      const { data: services } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("name", { ascending: true });
      if (services) setServicesList(services);

      // 3. Fetch Staff for dropdown
      const { data: staff } = await supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", business.id)
        .eq("status", "active")
        .order("name", { ascending: true });
      if (staff) setStaffList(staff);

      // 4. Fetch Sales records
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          payment_method,
          status,
          amount,
          created_at,
          clients(name),
          services(name),
          staff(name)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      if (salesData) {
        const mapped: Transaction[] = (salesData as unknown as SaleDB[]).map((s) => {
          const dateVal = new Date(s.created_at);
          const dateStr = dateVal.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          // Payment method UI mapping
          const methodMap: Record<string, "Card" | "Cash" | "Apple Pay"> = {
            card: "Card",
            cash: "Cash",
            online: "Apple Pay",
          };

          // Status mapping
          const statusMap: Record<string, "Paid" | "Pending" | "Refunded" | "Cancelled"> = {
            paid: "Paid",
            pending: "Pending",
            refunded: "Refunded",
            cancelled: "Cancelled",
          };

          return {
            id: s.id,
            clientName: s.clients?.name || "Walk-in Client",
            service: s.services?.name || "Custom Service",
            staff: s.staff?.name || "Any Specialist",
            date: dateStr,
            amount: Number(s.amount),
            method: methodMap[s.payment_method] || "Card",
            status: statusMap[s.status] || "Paid",
            invoiceNumber: s.invoice_number || `INV-${s.id.slice(0, 4).toUpperCase()}`,
          };
        });
        setTransactions(mapped);
      }
    } catch (err) {
      console.error("Error loading sales ledger:", err);
      setErrorMsg("Failed to retrieve sales transactions registry.");
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active) {
        fetchSalesData();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchSalesData]);

// Autofill amount is handled inside select onChange below

  // Handle Record Sale submit
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !inputAmount) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const invNum = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error } = await supabase
        .from("sales")
        .insert([
          {
            business_id: business.id,
            client_id: selectedClientId || null,
            service_id: selectedServiceId || null,
            staff_id: selectedStaffId || null,
            payment_method: paymentMethod,
            status: paymentStatus,
            amount: parseFloat(inputAmount),
            invoice_number: invNum,
            paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
          },
        ]);

      if (error) throw error;

      setIsRecordModalOpen(false);
      // Reset form
      setSelectedClientId("");
      setSelectedServiceId("");
      setSelectedStaffId("");
      setInputAmount("");
      setPaymentMethod("card");
      setPaymentStatus("paid");

      await fetchSalesData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to record manual sale transaction.");
    } finally {
      setSaving(false);
    }
  };

  // Update sale status (e.g. mark Paid, refund)
  const handleUpdateStatus = async (id: string, nextStatus: "paid" | "refunded") => {
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("sales")
        .update({
          status: nextStatus,
          paid_at: nextStatus === "paid" ? new Date().toISOString() : undefined,
        })
        .eq("id", id);

      if (error) throw error;
      await fetchSalesData();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update transaction status.");
    } finally {
      setSaving(false);
    }
  };

  const getMethodIcon = (method: "Card" | "Cash" | "Apple Pay") => {
    if (method === "Card")
      return <CreditCard className="size-4 text-slate-500" />;
    if (method === "Cash")
      return <Banknote className="size-4 text-slate-500" />;
    return <Smartphone className="size-4 text-slate-500" />;
  };

  // Filtering ledger
  const filteredTransactions = transactions.filter((t) => {
    const nameMatch = t.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const methodMatch = methodFilter === "all" || t.method === methodFilter;
    const statusMatch = statusFilter === "all" || t.status === statusFilter;
    return nameMatch && methodMatch && statusMatch;
  });

  // Calculate stats from Paid transactions
  const totalRevenue = transactions
    .filter((t) => t.status === "Paid")
    .reduce((sum, t) => sum + t.amount, 0);

  const cardRevenue = transactions
    .filter((t) => t.status === "Paid" && t.method === "Card")
    .reduce((sum, t) => sum + t.amount, 0);

  const cashRevenue = transactions
    .filter((t) => t.status === "Paid" && t.method === "Cash")
    .reduce((sum, t) => sum + t.amount, 0);

  const onlineRevenue = transactions
    .filter((t) => t.status === "Paid" && t.method === "Apple Pay")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <main className="flex min-h-screen w-full flex-col mt-4 font-sans">
      {/* Title & Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sales Ledger</h1>
          <p className="text-sm text-slate-505 mt-1.5">
            Track customer payments, issue invoices, and monitor billing channel logs.
          </p>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#0f294a] text-white px-4.5 py-2.5 text-xs font-semibold hover:bg-slate-800 transition active:scale-95 cursor-pointer shadow-lg shadow-slate-900/10"
        >
          <Plus className="size-4" /> Record Sale
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Revenue Snapshot Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Revenue */}
        <div className="rounded-[22px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{getCurrencySymbol(settings?.currency)}{totalRevenue.toFixed(2)}</h3>
          <div className="flex items-center gap-1 text-[10px] text-emerald-650 font-bold mt-1">
            <TrendingUp className="size-3.5" /> <span>Real-time live updates</span>
          </div>
        </div>

        {/* Card sales */}
        <div className="rounded-[22px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Payments</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{getCurrencySymbol(settings?.currency)}{cardRevenue.toFixed(2)}</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-1">
            <CreditCard className="size-3.5" /> <span>Terminal transactions</span>
          </div>
        </div>

        {/* Cash sales */}
        <div className="rounded-[22px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash Register</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{getCurrencySymbol(settings?.currency)}{cashRevenue.toFixed(2)}</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-1">
            <Banknote className="size-3.5" /> <span>Cash drawer ledger</span>
          </div>
        </div>

        {/* Online sales */}
        <div className="rounded-[22px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile & Online</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{getCurrencySymbol(settings?.currency)}{onlineRevenue.toFixed(2)}</h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-1">
            <Smartphone className="size-3.5" /> <span>Wallet / booking links</span>
          </div>
        </div>
      </div>

      {/* Roster list */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur min-h-[400px]">
        {/* Controls */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ledger by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-9 py-2 text-xs font-semibold text-slate-750 shadow-sm outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="all">All Methods</option>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Apple Pay">Apple Pay</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-9 py-2 text-xs font-semibold text-slate-750 shadow-sm outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Ledger Grid */}
        <div className="overflow-x-auto select-none scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-450">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-650 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading sales registry...</span>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-650">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Specialist</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {filteredTransactions.map((tx) => {
                  const statusColors = {
                    Paid: "bg-emerald-50 border-emerald-100 text-emerald-700",
                    Pending: "bg-amber-50 border-amber-100 text-amber-700",
                    Refunded: "bg-rose-50 border-rose-100 text-rose-700",
                    Cancelled: "bg-slate-100 border-slate-200 text-slate-500",
                  };

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/40 transition duration-150">
                      <td className="py-3.5 px-4 font-bold text-xs text-slate-800">{tx.invoiceNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-xs text-slate-900">{tx.clientName}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold">{tx.service}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{tx.staff}</td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-550">{tx.date}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {getMethodIcon(tx.method)}
                          <span>{tx.method}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-bold border uppercase tracking-wider px-2 py-0.5 rounded-md ${statusColors[tx.status]}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">{getCurrencySymbol(settings?.currency)}{tx.amount.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {tx.status === "Pending" && (
                            <button
                              disabled={saving}
                              onClick={() => handleUpdateStatus(tx.id, "paid")}
                              className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border border-emerald-250 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md cursor-pointer transition"
                            >
                              Collect
                            </button>
                          )}
                          {tx.status === "Paid" && (
                            <button
                              disabled={saving}
                              onClick={() => handleUpdateStatus(tx.id, "refunded")}
                              className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md cursor-pointer transition"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 select-none">
              <CreditCard className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-550">No matching sales records found</p>
            </div>
          )}
        </div>
      </div>

      {/* Record Sale Modal */}
      {isRecordModalOpen && (
        <div
          onClick={() => setIsRecordModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <button
              onClick={() => setIsRecordModalOpen(false)}
              className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <PlusCircle className="text-indigo-650" /> Record Sale Transaction
            </h3>
            <p className="text-xs text-slate-550 mb-5">Record a physical transaction to your sales revenue ledger.</p>

            <form onSubmit={handleRecordSale} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Client Profile</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">Walk-in Customer</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Service Item</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedServiceId(id);
                      const serv = servicesList.find((s) => s.id === id);
                      if (serv) {
                        setInputAmount(serv.price.toFixed(2));
                      } else {
                        setInputAmount("");
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">Custom Amount</option>
                    {servicesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block mb-1.5">Specialist</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">Any Staff</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Amount Paid ({getCurrencySymbol(settings?.currency)})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as "cash" | "card" | "online")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition cursor-pointer"
                  >
                    <option value="card">Card Payment</option>
                    <option value="cash">Cash Register</option>
                    <option value="online">Online / Apple Pay</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Initial Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as "paid" | "pending")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-450 focus:bg-white transition cursor-pointer"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 rounded-xl bg-[#0f294a] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-slate-900/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Transaction"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
