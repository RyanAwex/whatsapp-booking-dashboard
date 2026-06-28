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
  colorTheme: "pink" | "blue" | "purple" | "green" | "amber" | "cyan";
  notes: string;
  dayIndex: number; // 0 = Mon, 6 = Sun
  startMinute: number; // minutes from 8 AM
  durationMinutes: number;
  rawDate: Date;
  payment_method: string;
}

const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // Strip any trailing Z or timezone offset to force timezone-naive local parsing
  const clean = dateStr.replace(/Z$|[+-]\d{2}:?\d{2}$/, "");
  return new Date(clean);
};

export default function CalendarPage() {
  const { business, settings } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [servicesList, setServicesList] = useState<
    { id: string; name: string }[]
  >([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [selectedServiceFilter, setSelectedServiceFilter] =
    useState<string>("all");
  const [viewType, setViewType] = useState<"day" | "week" | "month" | "year">(
    "month",
  );
  const [focusedDate, setFocusedDate] = useState<Date>(new Date());

  // Helper to calculate weekly dates dynamically based on focusedDate (timezone-naive)
  const getWeekDays = React.useCallback((baseDate: Date) => {
    const today = new Date(baseDate);
    const day = today.getDay();
    // Monday of focusedDate week
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    const weekDaysList = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDaysList.push(d);
    }
    return weekDaysList;
  }, []);

  const weekDays = React.useMemo(
    () => getWeekDays(focusedDate),
    [focusedDate, getWeekDays],
  );

  const getMonthGridDays = React.useCallback((baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday = 0, Monday = 1...
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const daysList = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevTotalDays - i);
      daysList.push({ date: d, isMuted: true });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      daysList.push({ date: d, isMuted: false });
    }

    // Next month padding days to complete grid rows
    const totalSlots = daysList.length > 35 ? 42 : 35;
    const nextPadding = totalSlots - daysList.length;
    for (let i = 1; i <= nextPadding; i++) {
      const d = new Date(year, month + 1, i);
      daysList.push({ date: d, isMuted: true });
    }

    return daysList;
  }, []);

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
          payment_method?: string;
        }

        // 3. Define query range based on selected period
        let startQueryStr = "";
        let endQueryStr = "";

        const formatLocalISO = (d: Date) => {
          const y = d.getFullYear();
          const m = (d.getMonth() + 1).toString().padStart(2, "0");
          const dt = d.getDate().toString().padStart(2, "0");
          const hr = d.getHours().toString().padStart(2, "0");
          const mn = d.getMinutes().toString().padStart(2, "0");
          const sc = d.getSeconds().toString().padStart(2, "0");
          return `${y}-${m}-${dt}T${hr}:${mn}:${sc}`;
        };

        if (viewType === "day") {
          const start = new Date(focusedDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(focusedDate);
          end.setHours(23, 59, 59, 999);
          startQueryStr = formatLocalISO(start);
          endQueryStr = formatLocalISO(end);
        } else if (viewType === "week") {
          const day = focusedDate.getDay();
          const diff = focusedDate.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(focusedDate);
          monday.setDate(diff);

          const start = new Date(monday);
          start.setHours(0, 0, 0, 0);
          const end = new Date(monday);
          end.setDate(monday.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          startQueryStr = formatLocalISO(start);
          endQueryStr = formatLocalISO(end);
        } else if (viewType === "month") {
          const start = new Date(
            focusedDate.getFullYear(),
            focusedDate.getMonth(),
            1,
          );
          start.setDate(start.getDate() - 7); // pad slightly to load visible padding days
          start.setHours(0, 0, 0, 0);

          const end = new Date(
            focusedDate.getFullYear(),
            focusedDate.getMonth() + 1,
            0,
          );
          end.setDate(end.getDate() + 7); // pad slightly to load visible padding days
          end.setHours(23, 59, 59, 999);
          startQueryStr = formatLocalISO(start);
          endQueryStr = formatLocalISO(end);
        } else {
          // year
          const start = new Date(focusedDate.getFullYear(), 0, 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date(focusedDate.getFullYear(), 11, 31);
          end.setHours(23, 59, 59, 999);
          startQueryStr = formatLocalISO(start);
          endQueryStr = formatLocalISO(end);
        }

        // 4. Query appointments
        const { data: apptsData, error: apptsError } = await supabase
          .from("appointments")
          .select(
            `
            id,
            start_time,
            end_time,
            status,
            notes,
            clients(name, tag),
            services(name, price),
            staff(id, name),
            payment_method
          `,
          )
          .eq("business_id", business.id)
          .gte("start_time", startQueryStr)
          .lte("start_time", endQueryStr);

        if (apptsError) throw apptsError;

        if (apptsData) {
          const mapped: Appointment[] = (
            apptsData as unknown as ApptData[]
          ).map((a) => {
            const start = parseLocalDate(a.start_time);
            const end = parseLocalDate(a.end_time);

            // dayIndex (0 = Mon, 6 = Sun)
            const day = start.getDay();
            const dayIndex = day === 0 ? 6 : day - 1;

            // startMinute (relative to 8:00 AM)
            const startHour = start.getHours();
            const startMin = start.getMinutes();
            const startMinute = startHour * 60 + startMin - 480; // 8 AM is 480 mins

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

            // Assign color theme based on ID hash
            const colorsList: (
              | "pink"
              | "blue"
              | "purple"
              | "green"
              | "amber"
              | "cyan"
            )[] = ["blue", "purple", "green", "pink", "amber", "cyan"];
            const charSum = a.id
              .split("")
              .reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const colorTheme = colorsList[charSum % colorsList.length];

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
              rawDate: start,
              payment_method: a.payment_method || "cash",
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
  }, [business, focusedDate, viewType, settings, getWeekDays]);

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

  // Calculate layout configuration for cards, splitting columns for overlapping appointments
  const getDayAptsLayout = React.useCallback((dayApts: Appointment[]) => {
    // Sort appointments by start time, then duration
    const sorted = [...dayApts].sort((a, b) => {
      if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
      return b.durationMinutes - a.durationMinutes;
    });

    const columns: Appointment[][] = []; // columns[colIndex] = array of appointments in that column
    const aptToCol: Record<string, number> = {};

    for (const apt of sorted) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        // Check if apt overlaps with any appointment already in column c
        const hasOverlap = columns[c].some((other) => {
          return (
            apt.startMinute < other.startMinute + other.durationMinutes &&
            other.startMinute < apt.startMinute + apt.durationMinutes
          );
        });
        if (!hasOverlap) {
          columns[c].push(apt);
          aptToCol[apt.id] = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([apt]);
        aptToCol[apt.id] = columns.length - 1;
      }
    }

    // Group overlapping appointments into clusters to find the max columns in each cluster
    const clusters: Set<string>[] = [];
    for (const apt of sorted) {
      let foundCluster = false;
      for (const cluster of clusters) {
        const overlapsWithCluster = Array.from(cluster).some((otherId) => {
          const other = sorted.find((s) => s.id === otherId);
          if (!other) return false;
          return (
            apt.startMinute < other.startMinute + other.durationMinutes &&
            other.startMinute < apt.startMinute + apt.durationMinutes
          );
        });
        if (overlapsWithCluster) {
          cluster.add(apt.id);
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        clusters.push(new Set([apt.id]));
      }
    }

    const aptToMaxCols: Record<string, number> = {};
    for (const cluster of clusters) {
      // Find the maximum column index inside this cluster
      let maxCol = 0;
      cluster.forEach((id) => {
        if (aptToCol[id] > maxCol) {
          maxCol = aptToCol[id];
        }
      });
      cluster.forEach((id) => {
        aptToMaxCols[id] = maxCol + 1;
      });
    }

    // Compute styles
    const layouts: Record<
      string,
      { style: React.CSSProperties; className: string; isCompact: boolean }
    > = {};
    for (const apt of sorted) {
      const colIndex = aptToCol[apt.id];
      const totalCols = aptToMaxCols[apt.id] || 1;

      // Vertical position calculation (8 AM is 0px, each minute is 1px)
      // 10 hours from 8 AM to 6 PM = 600 minutes = 600px grid
      const top = Math.max(0, apt.startMinute);
      const height = Math.max(25, apt.durationMinutes); // min height of 25px

      const leftPercent = (colIndex / totalCols) * 100;
      const widthPercent = 100 / totalCols;

      const style: React.CSSProperties = {
        top: `${top}px`,
        height: `${height}px`,
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 3px)`,
        position: "absolute",
      };

      const isCompact = height < 45;
      const className = `absolute rounded-xl border p-2 text-left font-sans transition duration-200 hover:-translate-y-0.5 active:scale-98 shadow-sm flex flex-col justify-between overflow-hidden cursor-pointer ${
        isCompact ? "py-1 px-1.5" : ""
      }`;

      layouts[apt.id] = { style, className, isCompact };
    }

    return layouts;
  }, []);

  const handleNavigate = (direction: "prev" | "next") => {
    setFocusedDate((prev) => {
      const next = new Date(prev);
      const isNext = direction === "next";
      const sign = isNext ? 1 : -1;

      if (viewType === "day") {
        next.setDate(prev.getDate() + sign);
      } else if (viewType === "week") {
        next.setDate(prev.getDate() + sign * 7);
      } else if (viewType === "month") {
        next.setMonth(prev.getMonth() + sign);
      } else {
        // year
        next.setFullYear(prev.getFullYear() + sign);
      }
      return next;
    });
  };

  const handleUpdateStatus = async (apptId: string, newStatus: string) => {
    setUpdatingStatus(true);
    setErrorMsg(null);

    try {
      const dbStatus = newStatus.toLowerCase();
      const { error } = await supabase
        .from("appointments")
        .update({ status: dbStatus })
        .eq("id", apptId);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: newStatus } : a)),
      );

      setSelectedApt((prev) =>
        prev && prev.id === apptId ? { ...prev, status: newStatus } : prev,
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update appointment status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdatePaymentMethod = async (apptId: string, newPm: string) => {
    setUpdatingStatus(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ payment_method: newPm })
        .eq("id", apptId);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === apptId ? { ...a, payment_method: newPm } : a,
        ),
      );

      setSelectedApt((prev) =>
        prev && prev.id === apptId ? { ...prev, payment_method: newPm } : prev,
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update payment method.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteAppointment = async (apptId: string) => {
    if (
      !confirm("Are you sure you want to cancel and delete this appointment?")
    )
      return;
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
    if (viewType === "day") {
      return focusedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } else if (viewType === "week") {
      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
      };
      return `${weekDays[0].toLocaleDateString("en-US", options)} - ${weekDays[6].toLocaleDateString(
        "en-US",
        { ...options, year: "numeric" },
      )}`;
    } else if (viewType === "month") {
      return focusedDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else {
      // year
      return focusedDate.toLocaleDateString("en-US", {
        year: "numeric",
      });
    }
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
        <div className="flex flex-wrap items-center gap-3">
          {/* Nav buttons: [ < ] [ Today ] [ > ] */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => handleNavigate("prev")}
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setFocusedDate(new Date())}
              className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer select-none"
            >
              {viewType === "day"
                ? "Today"
                : viewType === "week"
                  ? weekDays.some(
                      (d) => d.toDateString() === new Date().toDateString(),
                    )
                    ? "This Week"
                    : "Week"
                  : viewType === "month"
                    ? focusedDate.getMonth() === new Date().getMonth() &&
                      focusedDate.getFullYear() === new Date().getFullYear()
                      ? "This Month"
                      : "Month"
                    : focusedDate.getFullYear() === new Date().getFullYear()
                      ? "This Year"
                      : "Year"}
            </button>
            <button
              onClick={() => handleNavigate("next")}
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Selector: [ Day ] [ Week ] [ Month ] [ Year ] */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["day", "week", "month", "year"] as const).map((view) => {
              const isSelected = viewType === view;
              return (
                <button
                  key={view}
                  onClick={() => setViewType(view)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold capitalize transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-[#0f294a] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {view}
                </button>
              );
            })}
          </div>

          <span className="text-sm font-semibold text-slate-700 select-none min-w-40 text-center">
            {getDateRangeLabel()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
        {/* Calendar Grid container (col-span-3) */}
        <div className="xl:col-span-3 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur overflow-hidden">
          {loading ? (
            <div className="flex h-[700px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
            </div>
          ) : viewType === "month" ? (
            <div className="flex flex-col h-[700px]">
              {/* Month Header Days */}
              <div className="grid grid-cols-7 border-b border-slate-100 pb-3 text-center mb-1">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                  (dayName) => (
                    <div
                      key={dayName}
                      className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400"
                    >
                      {dayName}
                    </div>
                  ),
                )}
              </div>

              {/* Month Days Grid */}
              <div className="grid grid-cols-7 flex-1 overflow-y-auto divide-x divide-y divide-slate-100 border border-slate-100/70 rounded-xl overflow-hidden bg-slate-50/50">
                {getMonthGridDays(focusedDate).map(
                  ({ date: d, isMuted }, idx) => {
                    const isToday =
                      d.toDateString() === new Date().toDateString();
                    const isFirstDayOfMonth = d.getDate() === 1;
                    const dateLabel = isFirstDayOfMonth
                      ? d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : d.getDate().toString();

                    const dayAppts = filteredAppointments.filter((a) => {
                      const ad = new Date(a.rawDate);
                      return (
                        ad.getFullYear() === d.getFullYear() &&
                        ad.getMonth() === d.getMonth() &&
                        ad.getDate() === d.getDate()
                      );
                    });

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setFocusedDate(d);
                          setViewType("day");
                        }}
                        className={`min-h-[110px] p-2 flex flex-col justify-between hover:bg-slate-50 transition cursor-pointer relative ${
                          isMuted ? "bg-slate-50/50" : "bg-white"
                        }`}
                      >
                        <div className="flex justify-end w-full mb-1">
                          <span
                            className={`text-[10px] font-extrabold ${
                              isToday
                                ? "bg-indigo-600 text-white rounded-full size-6 flex items-center justify-center shadow-md shadow-indigo-650/15"
                                : isMuted
                                  ? "text-slate-400"
                                  : "text-slate-700"
                            }`}
                          >
                            {dateLabel}
                          </span>
                        </div>

                        <div className="flex-1 space-y-1 overflow-hidden">
                          {dayAppts.slice(0, 3).map((appt) => {
                            const dotColor =
                              appt.status.toLowerCase() === "completed"
                                ? "bg-emerald-500"
                                : appt.status.toLowerCase() === "no_show"
                                  ? "bg-amber-500"
                                  : appt.status.toLowerCase() === "cancelled"
                                    ? "bg-rose-500"
                                    : "bg-indigo-500";

                            return (
                              <div
                                key={appt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFocusedDate(d);
                                  setViewType("day");
                                  setSelectedApt(appt);
                                }}
                                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold select-none cursor-pointer truncate ${
                                  appt.status.toLowerCase() === "completed"
                                    ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                    : appt.status.toLowerCase() === "no_show"
                                      ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                                      : appt.status.toLowerCase() ===
                                          "cancelled"
                                        ? "bg-rose-50 text-rose-800 hover:bg-rose-100"
                                        : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                                }`}
                                title={`${appt.clientName} - ${appt.service} (${appt.timeRange})`}
                              >
                                <span
                                  className={`size-1.5 rounded-full shrink-0 ${dotColor}`}
                                />
                                <span className="truncate">
                                  {appt.clientName.split(" ")[0]}
                                </span>
                              </div>
                            );
                          })}
                          {dayAppts.length > 3 && (
                            <div className="text-[9px] font-extrabold text-slate-400 pl-1 select-none">
                              + {dayAppts.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ) : viewType === "year" ? (
            <div className="flex flex-col h-[700px] overflow-y-auto scrollbar pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-1">
                {Array.from({ length: 12 }, (_, monthIdx) => {
                  const monthDate = new Date(
                    focusedDate.getFullYear(),
                    monthIdx,
                    1,
                  );
                  const monthName = monthDate.toLocaleDateString("en-US", {
                    month: "long",
                  });

                  const daysInMonth = new Date(
                    focusedDate.getFullYear(),
                    monthIdx + 1,
                    0,
                  ).getDate();
                  const startDayIndex = new Date(
                    focusedDate.getFullYear(),
                    monthIdx,
                    1,
                  ).getDay();

                  return (
                    <div
                      key={monthIdx}
                      onClick={() => {
                        setFocusedDate(monthDate);
                        setViewType("month");
                      }}
                      className="rounded-2xl border border-slate-200/80 bg-white p-3 hover:shadow-md transition cursor-pointer select-none"
                    >
                      <h4 className="text-sm font-extrabold text-slate-900 mb-2 text-center capitalize">
                        {monthName}
                      </h4>
                      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
                        {["S", "M", "T", "W", "T", "F", "S"].map(
                          (dName, dIdx) => (
                            <div
                              key={dIdx}
                              className="text-[9px] font-bold text-slate-400"
                            >
                              {dName}
                            </div>
                          ),
                        )}
                        {Array.from({ length: startDayIndex }).map(
                          (_, pIdx) => (
                            <div key={`p-${pIdx}`} />
                          ),
                        )}
                        {Array.from({ length: daysInMonth }).map(
                          (_, dayIdx) => {
                            const dayNum = dayIdx + 1;
                            const dObj = new Date(
                              focusedDate.getFullYear(),
                              monthIdx,
                              dayNum,
                            );
                            const isToday =
                              dObj.toDateString() === new Date().toDateString();

                            const hasAppts = appointments.some((a) => {
                              const ad = new Date(a.rawDate);
                              return (
                                ad.getFullYear() === dObj.getFullYear() &&
                                ad.getMonth() === dObj.getMonth() &&
                                ad.getDate() === dObj.getDate()
                              );
                            });

                            return (
                              <div
                                key={dayNum}
                                className={`text-[9px] font-bold rounded-md size-5.5 flex items-center justify-center mx-auto transition ${
                                  isToday
                                    ? "bg-indigo-650 text-white shadow-sm"
                                    : hasAppts
                                      ? "bg-indigo-50 text-indigo-700 font-extrabold"
                                      : "text-slate-655"
                                }`}
                              >
                                {dayNum}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Week/Day timeline views
            <div className="flex flex-col h-[700px] overflow-hidden">
              <div className="grid grid-cols-8 border-b border-slate-100 pb-3 text-center mb-1">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Time
                </div>
                {viewType === "week" ? (
                  weekDays.map((day, idx) => {
                    const isToday =
                      day.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setFocusedDate(day);
                          setViewType("day");
                        }}
                        className="flex flex-col items-center cursor-pointer hover:bg-slate-50 rounded-xl py-1 transition active:scale-95"
                      >
                        <span
                          className={`text-[10px] uppercase font-bold tracking-widest ${isToday ? "text-indigo-600 font-extrabold" : "text-slate-450"}`}
                        >
                          {day.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <span
                          className={`text-base font-extrabold mt-0.5 rounded-full flex items-center justify-center size-7.5 ${
                            isToday
                              ? "bg-indigo-650 text-indigo-600 shadow-md"
                              : "text-slate-800"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-7 flex flex-col items-center justify-center py-1">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-650">
                      {focusedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                      })}
                    </span>
                    <span className="text-sm font-extrabold mt-0.5 text-slate-800 tracking-tight">
                      {focusedDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto relative scrollbar pr-1">
                <div className="grid grid-cols-8 h-[600px] relative">
                  <div className="flex flex-col justify-between py-1 border-r border-slate-100 pr-3">
                    {timeSlots.map((time, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right select-none h-6"
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  {(viewType === "week" ? weekDays : [focusedDate]).map(
                    (day, idx) => {
                      const dayApts = filteredAppointments.filter(
                        (a) => a.rawDate.toDateString() === day.toDateString(),
                      );
                      const layouts = getDayAptsLayout(dayApts);

                      return (
                        <div
                          key={idx}
                          className={`relative border-r border-slate-100/50 h-full ${
                            viewType === "day" ? "col-span-7" : ""
                          }`}
                        >
                          {Array.from({ length: 9 }, (_, lineIdx) => (
                            <div
                              key={lineIdx}
                              className="absolute left-0 right-0 border-b border-dashed border-slate-100/70"
                              style={{ top: `${((lineIdx + 1) / 10) * 100}%` }}
                            />
                          ))}

                          {dayApts.map((appt) => {
                            const layout = layouts[appt.id];
                            if (!layout) return null;
                            const isSelected = selectedApt?.id === appt.id;

                            const themeClasses = {
                              pink: isSelected
                                ? "bg-rose-500 text-white border-rose-600 animate-in zoom-in-95"
                                : "bg-rose-50/50 text-rose-800 border-rose-100 hover:bg-white",
                              blue: isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 animate-in zoom-in-95"
                                : "bg-indigo-50/50 text-indigo-800 border-indigo-100 hover:bg-white",
                              purple: isSelected
                                ? "bg-purple-600 text-white border-purple-700 animate-in zoom-in-95"
                                : "bg-purple-50/50 text-purple-800 border-purple-100 hover:bg-white",
                              green: isSelected
                                ? "bg-emerald-600 text-white border-emerald-700 animate-in zoom-in-95"
                                : "bg-emerald-50/50 text-emerald-800 border-emerald-100 hover:bg-white",
                              amber: isSelected
                                ? "bg-amber-500 text-white border-amber-600 animate-in zoom-in-95"
                                : "bg-amber-50/50 text-amber-900 border-amber-100 hover:bg-white",
                              cyan: isSelected
                                ? "bg-cyan-500 text-white border-cyan-600 animate-in zoom-in-95"
                                : "bg-cyan-50/50 text-cyan-900 border-cyan-100 hover:bg-white",
                            };

                            return (
                              <button
                                key={appt.id}
                                style={layout.style}
                                onClick={() => setSelectedApt(appt)}
                                className={`${layout.className} ${themeClasses[appt.colorTheme]} ${
                                  layout.isCompact
                                    ? "justify-center items-center"
                                    : ""
                                }`}
                                title={`${appt.clientName} - ${appt.service} (${appt.staff})`}
                              >
                                {layout.isCompact ? (
                                  <span className="text-[9px] font-extrabold truncate w-full text-center px-1 select-none uppercase tracking-wide opacity-90 leading-none">
                                    {appt.status.replace("_", " ")}
                                  </span>
                                ) : (
                                  <div className="min-w-0">
                                    <h4 className="text-[11px] font-bold truncate leading-tight">
                                      {appt.clientName}
                                    </h4>
                                    <p className="text-[9px] truncate font-medium mt-0.5 opacity-90">
                                      {appt.service}
                                    </p>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          )}
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
                    {selectedApt.clientName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
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
                      const isCurrent =
                        selectedApt.status.toLowerCase() === st.toLowerCase();
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

                {/* Payment Method editor */}
                <div className="border-t border-slate-100 mt-5 pt-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Payment Method
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["cash", "card", "online"].map((pm) => {
                      const isCurrent =
                        selectedApt.payment_method?.toLowerCase() ===
                        pm.toLowerCase();
                      return (
                        <button
                          key={pm}
                          disabled={updatingStatus}
                          onClick={() =>
                            handleUpdatePaymentMethod(selectedApt.id, pm)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition cursor-pointer ${
                            isCurrent
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                          }`}
                        >
                          {pm}
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
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 my-auto select-none">
              <Calendar className="size-10 text-slate-300 stroke-[1.5] mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">
                No Appointment Selected
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-44 leading-relaxed">
                Click on any appointment card in the schedule grid to view
                notes, pricing, and update status.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
