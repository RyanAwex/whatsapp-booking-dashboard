"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import { getCurrencySymbol } from "@/lib/constants";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Scissors,
  DollarSign,
  CheckCircle2,
  X,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Appointment {
  id: string;
  clientName: string;
  clientType: string;
  service: string;
  staff: string;
  date: string;
  timeRange: string;
  price: string;
  status: string;
  colorTheme: "pink" | "blue" | "purple" | "green";
  notes: string;
  dayIndex: number; // 0 = Mon, 6 = Sun
  startMinute: number; // minutes from 8 AM
  durationMinutes: number;
}

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // Strip any trailing Z or timezone offset to force timezone-naive local parsing
  const clean = dateStr.replace(/Z$|[+-]\d{2}:?\d{2}$/, "");
  return new Date(clean);
};

export default function CalendarPage() {
  const { business, settings } = useAuth();
  console.log("CALENDAR RENDERING - business:", business?.id, "settings:", settings);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [servicesList, setServicesList] = useState<{ id: string; name: string }[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("all");
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);

  // Helper to calculate weekly dates dynamically based on offset (timezone-naive)
  const getWeekDays = React.useCallback((offset: number) => {
    const today = new Date();
    const day = today.getDay();
    // Monday of current week
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setDate(monday.getDate() + offset * 7);

    const weekDaysList = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDaysList.push(d);
    }
    return weekDaysList;
  }, []);

  const weekDays = React.useMemo(() => getWeekDays(currentWeekOffset), [currentWeekOffset, getWeekDays]);

  // Fetch appointments and filters
  useEffect(() => {
    if (!business?.id) return;

    const loadCalendar = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1. Fetch Staff List for filter
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name")
          .eq("business_id", business.id)
          .eq("status", "active");
        if (staffData) setStaffList(staffData);

        // 2. Fetch Services List for filter
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, name")
          .eq("business_id", business.id)
          .eq("status", "active");
        if (servicesData) setServicesList(servicesData);

        interface ApptData {
          id: string;
          start_time: string;
          end_time: string;
          status: string;
          notes: string | null;
          clients: { name: string; tag: string | null } | null;
          services: { name: string; price: number } | null;
          staff: { id: string; name: string } | null;
        }

        // 3. Define local ISO Range for selected week (timezone-naive)
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        monday.setDate(monday.getDate() + currentWeekOffset * 7);

        const startOfWeek = new Date(monday);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(monday);
        endOfWeek.setDate(monday.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const formatLocalISO = (d: Date) => {
          const y = d.getFullYear();
          const m = (d.getMonth() + 1).toString().padStart(2, "0");
          const dt = d.getDate().toString().padStart(2, "0");
          const hr = d.getHours().toString().padStart(2, "0");
          const mn = d.getMinutes().toString().padStart(2, "0");
          const sc = d.getSeconds().toString().padStart(2, "0");
          return `${y}-${m}-${dt}T${hr}:${mn}:${sc}`;
        };

        const startQueryStr = formatLocalISO(startOfWeek);
        const endQueryStr = formatLocalISO(endOfWeek);

        // 4. Query appointments
        const { data: apptsData, error: apptsError } = await supabase
          .from("appointments")
          .select(`
            id,
            start_time,
            end_time,
            status,
            notes,
            clients(name, tag),
            services(name, price),
            staff(id, name)
          `)
          .eq("business_id", business.id)
          .gte("start_time", startQueryStr)
          .lte("start_time", endQueryStr);

        if (apptsError) throw apptsError;

        if (apptsData) {
          const mapped: Appointment[] = (apptsData as unknown as ApptData[]).map((a) => {
            const start = parseLocalDate(a.start_time);
            const end = parseLocalDate(a.end_time);

            // dayIndex (0 = Mon, 6 = Sun)
            const day = start.getDay();
            const dayIndex = day === 0 ? 6 : day - 1;

            // startMinute (relative to 8:00 AM)
            const startHour = start.getHours();
            const startMin = start.getMinutes();
            const startMinute = (startHour * 60 + startMin) - 480; // 8 AM is 480 mins

            // duration
            const durationMinutes = (end.getTime() - start.getTime()) / 60000;

            const formatTime12 = (h: number, m: number) => {
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 || 12;
              return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
            };
            const timeRange = `${formatTime12(startHour, startMin)} - ${formatTime12(end.getHours(), end.getMinutes())}`;

            const dateStr = start.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            // Cycle themes based on status
            const themes: Record<string, "pink" | "blue" | "purple" | "green"> = {
              pending: "pink",
              confirmed: "blue",
              completed: "green",
              no_show: "purple",
              cancelled: "pink",
            };
            const colorTheme = themes[a.status] || "blue";

            return {
              id: a.id,
              clientName: a.clients?.name || "Client",
              clientType: a.clients?.tag || "New",
              service: a.services?.name || "Service",
              staff: a.staff?.name || "Specialist",
              date: dateStr,
              timeRange,
              price: `${getCurrencySymbol(settings?.currency)}${Number(a.services?.price || 0).toFixed(2)}`,
              status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
              colorTheme,
              notes: a.notes || "No additional instructions provided.",
              dayIndex,
              startMinute,
              durationMinutes,
            };
          });

          setAppointments(mapped);

          // Update active selected detail card if applicable
          setSelectedApt((prev) => {
            if (!prev) return null;
            return mapped.find((m) => m.id === prev.id) || null;
          });
        }
      } catch (err) {
        console.error("Error loading calendar appointments:", err);
        setErrorMsg("Failed to retrieve schedule appointments.");
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, [business, currentWeekOffset, settings]);

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    const staffMatch =
      selectedStaffFilter === "all" ||
      apt.staff.toLowerCase().includes(selectedStaffFilter.toLowerCase());
    const serviceMatch =
      selectedServiceFilter === "all" ||
      apt.service.toLowerCase().includes(selectedServiceFilter.toLowerCase());
    return staffMatch && serviceMatch;
  });

  // Calculate layout configuration for cards, with dynamic stacking when overlapping
  const getAptLayout = (apt: Appointment, dayApts: Appointment[]) => {
    const overlaps = dayApts.filter(
      (other) =>
        other.id !== apt.id &&
        apt.startMinute < other.startMinute + other.durationMinutes &&
        other.startMinute < apt.startMinute + apt.durationMinutes
    );

    // Assume 10-hour day from 8 AM to 6 PM (600 minutes total)
    const topPercent = Math.max(0, (apt.startMinute / 600) * 100);
    const heightPercent = Math.min(100 - topPercent, (apt.durationMinutes / 600) * 100);

    if (overlaps.length === 0) {
      const isSelected = selectedApt?.id === apt.id;
      return {
        style: {
          top: `${topPercent}%`,
          height: `${heightPercent}%`,
          left: "4px",
          right: "4px",
        },
        className: `z-10 absolute rounded-xl p-2.5 text-left border flex flex-col justify-between transition-all duration-200 ${
          isSelected ? "z-25 border-indigo-650 shadow-md ring-1 ring-indigo-500/20" : "border-slate-200/80 shadow-sm"
        }`,
      };
    }

    const isThisSelected = selectedApt?.id === apt.id;
    const isAnyOverlapSelected = overlaps.some((other) => selectedApt?.id === other.id);

    let isInFront = false;
    if (isThisSelected) {
      isInFront = true;
    } else if (!isAnyOverlapSelected) {
      const sortedIds = [apt.id, ...overlaps.map((o) => o.id)].sort();
      isInFront = sortedIds[0] === apt.id;
    }

    return {
      style: {
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        left: isInFront ? "12px" : "4px",
        right: isInFront ? "4px" : "12px",
        transform: isInFront ? "scale(1.01)" : "scale(0.97)",
      },
      className: `absolute rounded-xl p-2.5 text-left border flex flex-col justify-between transition-all duration-200 ${
        isInFront
          ? "z-20 border-indigo-650 shadow-md ring-1 ring-indigo-500/20"
          : "z-10 border-slate-200/80 shadow-sm opacity-80"
      }`,
    };
  };

  const handleUpdateStatus = async (apptId: string, nextStatus: string) => {
    setUpdatingStatus(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: nextStatus.toLowerCase() })
        .eq("id", apptId);

      if (error) throw error;

      // Update state local list
      setAppointments(
        appointments.map((a) =>
          a.id === apptId
            ? {
                ...a,
                status: nextStatus,
                colorTheme:
                  nextStatus.toLowerCase() === "completed"
                    ? "green"
                    : nextStatus.toLowerCase() === "no_show"
                    ? "purple"
                    : "blue",
              }
            : a
        )
      );

      // Update active selection detail
      if (selectedApt?.id === apptId) {
        setSelectedApt((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                colorTheme:
                  nextStatus.toLowerCase() === "completed"
                    ? "green"
                    : nextStatus.toLowerCase() === "no_show"
                    ? "purple"
                    : "blue",
              }
            : null
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update appointment status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteAppointment = async (apptId: string) => {
    if (!confirm("Are you sure you want to cancel and delete this appointment?")) return;
    setUpdatingStatus(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", apptId);

      if (error) throw error;

      setAppointments(appointments.filter((a) => a.id !== apptId));
      setSelectedApt(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete appointment.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getDateRangeLabel = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${weekDays[0].toLocaleDateString("en-US", options)} - ${weekDays[6].toLocaleDateString(
      "en-US",
      { ...options, year: "numeric" }
    )}`;
  };

  // Generate 8 AM - 6 PM times for grid lines
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 8;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  });

  return (
    <main className="flex min-h-screen w-full flex-col mt-4 font-sans">
      {/* Toolbar section */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Calendar Schedule
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setCurrentWeekOffset(0);
              setSelectedStaffFilter("all");
              setSelectedServiceFilter("all");
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 cursor-pointer"
          >
            Today
          </button>

          {/* Nav buttons */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
              aria-label="Previous Week"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 text-sm font-semibold text-slate-700 select-none min-w-40 text-center">
              {getDateRangeLabel()}
            </span>
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
              aria-label="Next Week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-9 py-2 text-xs font-semibold text-slate-750 shadow-sm outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="all">All Specialists</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={selectedServiceFilter}
                onChange={(e) => setSelectedServiceFilter(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-9 py-2 text-xs font-semibold text-slate-750 shadow-sm outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="all">All Services</option>
                {servicesList.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-805 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4 items-start">
        {/* Calendar Week view (col-span-3) */}
        <div className="xl:col-span-3 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur overflow-hidden">
          <div className="flex flex-col h-[700px] overflow-hidden">
            {/* Header Dates */}
            <div className="grid grid-cols-8 border-b border-slate-100 pb-3 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Time
              </div>
              {weekDays.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${isToday ? "text-indigo-600 font-extrabold" : "text-slate-450"}`}>
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className={`text-base font-extrabold mt-0.5 rounded-full flex items-center justify-center size-7.5 ${
                      isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/15" : "text-slate-800"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Time slot lines & cards */}
            <div className="flex-1 overflow-y-auto relative scrollbar pr-1">
              {loading ? (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : null}

              {/* Grid backdrop time lines */}
              <div className="grid grid-cols-8 h-[600px] relative">
                {/* Y-Axis Time Labels */}
                <div className="flex flex-col justify-between py-1 border-r border-slate-100 pr-3">
                  {timeSlots.map((time, idx) => (
                    <div key={idx} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right select-none h-6">
                      {time}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const dayApts = filteredAppointments.filter((a) => a.dayIndex === dayIdx);
                  return (
                    <div key={dayIdx} className="relative border-r border-slate-100/50 h-full">
                      {/* Render line dividers internally */}
                      {Array.from({ length: 9 }, (_, lineIdx) => (
                        <div
                          key={lineIdx}
                          className="absolute left-0 right-0 border-b border-dashed border-slate-100/70"
                          style={{ top: `${((lineIdx + 1) / 10) * 100}%` }}
                        />
                      ))}

                      {/* Display Appointment cards */}
                      {dayApts.map((appt) => {
                        const layout = getAptLayout(appt, dayApts);
                        const isSelected = selectedApt?.id === appt.id;

                        // Theme classes
                        const themeClasses = {
                          pink: isSelected
                            ? "bg-rose-500 text-white border-rose-600"
                            : "bg-rose-50/50 text-rose-800 border-rose-100 hover:bg-white",
                          blue: isSelected
                            ? "bg-indigo-600 text-white border-indigo-700"
                            : "bg-indigo-50/50 text-indigo-800 border-indigo-100 hover:bg-white",
                          purple: isSelected
                            ? "bg-purple-600 text-white border-purple-700"
                            : "bg-purple-50/50 text-purple-800 border-purple-100 hover:bg-white",
                          green: isSelected
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-emerald-50/50 text-emerald-800 border-emerald-100 hover:bg-white",
                        };

                        const badgeColor = isSelected
                          ? "bg-white/20 text-white"
                          : "bg-white border text-slate-500 border-slate-200/60";

                        return (
                          <button
                            key={appt.id}
                            style={layout.style}
                            onClick={() => setSelectedApt(appt)}
                            className={`${layout.className} ${themeClasses[appt.colorTheme]}`}
                          >
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-bold truncate leading-tight">
                                {appt.clientName}
                              </h4>
                              <p className="text-[9px] truncate font-medium mt-0.5 opacity-90">
                                {appt.service}
                              </p>
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 w-fit select-none ${badgeColor}`}>
                              {appt.staff.split(" ")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Detail drawer (col-span-1) */}
        <div className="xl:col-span-1 flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.22)] backdrop-blur min-h-150 h-full justify-between">
          {selectedApt ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Appointment Details
                  </h2>
                  <button
                    onClick={() => setSelectedApt(null)}
                    className="flex size-7 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Client Profile Row */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 mt-4 shadow-sm">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm select-none shadow-md">
                    {selectedApt.clientName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {selectedApt.clientName}
                    </h3>
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md mt-0.5">
                      {selectedApt.clientType} Tag
                    </span>
                  </div>
                </div>

                {/* Details info fields */}
                <div className="mt-5 space-y-4 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <Calendar className="size-4.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 leading-tight">
                        {selectedApt.date}
                      </p>
                      <p className="text-xs text-slate-550 mt-1">
                        {selectedApt.timeRange}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Scissors className="size-4.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 leading-tight">
                        {selectedApt.service}
                      </p>
                      <p className="text-xs text-slate-550 mt-1">
                        Assigned to {selectedApt.staff}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="size-4.5 text-slate-400 shrink-0" />
                    <p className="font-extrabold text-slate-900">
                      {selectedApt.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-indigo-700 px-2.5 py-1 w-fit text-xs font-bold select-none">
                    <CheckCircle2 className="size-3.5" />
                    {selectedApt.status}
                  </div>
                </div>

                {/* Status action toggles */}
                <div className="border-t border-slate-100 mt-5 pt-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Action / Status
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Confirmed", "Completed", "No_Show"].map((st) => {
                      const isCurrent = selectedApt.status.toLowerCase() === st.toLowerCase();
                      return (
                        <button
                          key={st}
                          disabled={updatingStatus}
                          onClick={() => handleUpdateStatus(selectedApt.id, st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            isCurrent
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                          }`}
                        >
                          {st.replace("_", " ")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="border-t border-slate-100 mt-5 pt-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Client Notes
                  </h4>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                    {selectedApt.notes}
                  </p>
                </div>
              </div>

              {/* Cancel Button */}
              <div className="border-t border-slate-100 mt-5 pt-4">
                <button
                  onClick={() => handleDeleteAppointment(selectedApt.id)}
                  disabled={updatingStatus}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50 text-rose-700 py-2.5 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  Cancel Appointment
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto select-none">
              <Calendar className="size-10 text-slate-300 stroke-[1.5] mb-3 animate-bounce" />
              <h3 className="font-bold text-slate-800 text-sm">
                No Appointment Selected
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-44 leading-relaxed">
                Click on any appointment card in the schedule grid to view notes, pricing, and update status.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
