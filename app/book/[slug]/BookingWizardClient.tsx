"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrencySymbol } from "@/lib/constants";
import {
  CheckCircle2,
  Scissors,
  ChevronRight,
  ChevronLeft,
  User,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  category_id: string;
  description: string;
  duration_minutes: number;
  price: number;
  status: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  description: string;
  status: string;
}

interface WorkingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  staff_id: string | null;
}

interface Business {
  id: string;
  name: string;
  category?: string;
  phone?: string;
  address?: string;
  status?: string;
}

interface BusinessSettings {
  id: string;
  business_id: string;
  currency: string;
  timezone: string;
  booking_page_slug: string;
  booking_approval_mode: "automatic" | "manual";
  allow_client_cancel: boolean;
  cancel_limit_hours: number;
}

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  staff_id: string | null;
}

interface BookingWizardClientProps {
  business: Business;
  settings: BusinessSettings;
  services: Service[];
  staff: Staff[];
  workingHours: WorkingHour[];      // business-level hours (staff_id = null)
  staffWorkingHours: WorkingHour[]; // all staff-specific hours
  existingAppointments: Appointment[];
}

export default function BookingWizardClient({
  business,
  settings,
  services,
  staff,
  workingHours,
  staffWorkingHours,
  existingAppointments,
}: BookingWizardClientProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selections state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>(""); // staff ID or "any"
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>(""); // e.g. "09:30"

  // Customer contact info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Generate the next 14 booking dates
  const dateList = React.useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  // Get effective hours for a specific staff member on a given day.
  // Checks staff-specific overrides first, then falls back to business-level hours.
  const getEffectiveHours = React.useCallback(
    (dayOfWeek: number, staffId: string) => {
      const staffSpecific = staffWorkingHours.find(
        (h) => h.staff_id === staffId && h.day_of_week === dayOfWeek
      );
      if (staffSpecific) return staffSpecific;
      // Fall back to business-level hours
      return workingHours.find((h) => h.day_of_week === dayOfWeek) || null;
    },
    [workingHours, staffWorkingHours]
  );

  // Parse date string timezone-naively as browser local time to match slot generation timezone context
  const parseNaiveDate = React.useCallback((dateStr: string): Date => {
    if (!dateStr) return new Date();
    // Remove any trailing Z or timezone offset to force timezone-naive local parsing
    const clean = dateStr.replace(/Z$|[+-]\d{2}:?\d{2}$/, "");
    return new Date(clean);
  }, []);

  // Check if a time slot overlaps with an existing appointment for a SPECIFIC staff member
  const isStaffSlotOccupied = React.useCallback(
    (slotStart: Date, durationMins: number, staffId: string) => {
      const slotEnd = new Date(slotStart.getTime() + durationMins * 60 * 1000);
      return existingAppointments.some((appt) => {
        if (appt.staff_id !== staffId) return false;
        const apptStart = parseNaiveDate(appt.start_time);
        const apptEnd = parseNaiveDate(appt.end_time);
        return slotStart < apptEnd && slotEnd > apptStart;
      });
    },
    [existingAppointments, parseNaiveDate]
  );

  // Generate slots for one specific staff member on a given date (timezone-naive local browser time)
  const getSlotsForStaff = React.useCallback(
    (staffId: string, date: Date, durationMins: number): string[] => {
      const dayOfWeek = date.getDay();
      const config = getEffectiveHours(dayOfWeek, staffId);
      if (!config || config.is_closed) return [];

      const [openH, openM] = config.open_time.split(":").map(Number);
      const [closeH, closeM] = config.close_time.split(":").map(Number);

      const current = new Date(date);
      current.setHours(openH, openM, 0, 0);

      const end = new Date(date);
      end.setHours(closeH, closeM, 0, 0);
      end.setMinutes(end.getMinutes() - durationMins);

      const now = new Date();
      const slots: string[] = [];

      while (current <= end) {
        const occupied = isStaffSlotOccupied(new Date(current), durationMins, staffId);
        const isInPast =
          date.toDateString() === now.toDateString() &&
          current.getTime() <= now.getTime();

        if (!isInPast && !occupied) {
          const h = current.getHours();
          const m = current.getMinutes();
          slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
        }

        current.setMinutes(current.getMinutes() + 30);
      }

      return slots;
    },
    [getEffectiveHours, isStaffSlotOccupied]
  );

  // Compute available time slots based on staff selection
  const availableSlots = React.useMemo(() => {
    if (!selectedDate || !selectedService) return [];

    if (selectedStaff !== "any" && selectedStaff !== "") {
      // Specific staff member: use their own hours + their own appointments
      return getSlotsForStaff(selectedStaff, selectedDate, selectedService.duration_minutes);
    }

    // "Any Specialist": union of slots available across ALL active staff members.
    // A slot is shown if at least one staff member is free at that time.
    const allSlots = new Set<string>();
    for (const s of staff) {
      const slots = getSlotsForStaff(s.id, selectedDate, selectedService.duration_minutes);
      slots.forEach((slot) => allSlots.add(slot));
    }

    // Return sorted chronologically
    return Array.from(allSlots).sort();
  }, [selectedDate, selectedService, selectedStaff, staff, getSlotsForStaff]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId);
    setSelectedDate(null);
    setSelectedTime("");
    setStep(3);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };



  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !name.trim() || !phone.trim()) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Check if client profile exists
      let clientId = null;
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("business_id", business.id)
        .eq("phone", phone.trim())
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert([
            {
              business_id: business.id,
              name: name.trim(),
              phone: phone.trim(),
              email: email.trim() || null,
              tag: "New",
            },
          ])
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 2. Build start & end times as timezone-naive local ISO strings
      const formatLocalISO = (d: Date, hour: number, minute: number) => {
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const dateVal = d.getDate().toString().padStart(2, "0");
        const hr = hour.toString().padStart(2, "0");
        const min = minute.toString().padStart(2, "0");
        return `${year}-${month}-${dateVal}T${hr}:${min}:00`;
      };

      const [startH, startM] = selectedTime.split(":").map(Number);
      const startISO = formatLocalISO(selectedDate, startH, startM);

      const endDate = new Date(selectedDate);
      endDate.setHours(startH, startM, 0, 0);
      endDate.setMinutes(endDate.getMinutes() + selectedService.duration_minutes);
      const endISO = formatLocalISO(endDate, endDate.getHours(), endDate.getMinutes());

      // 3. Determine staff ID
      let staffId = null;
      if (selectedStaff === "any") {
        staffId = staff.length > 0 ? staff[0].id : null;
      } else {
        staffId = selectedStaff;
      }

      // 4. Create appointment
      const status = settings.booking_approval_mode === "manual" ? "pending" : "confirmed";
      const { error: apptError } = await supabase
        .from("appointments")
        .insert([
          {
            business_id: business.id,
            client_id: clientId,
            service_id: selectedService.id,
            staff_id: staffId,
            start_time: startISO,
            end_time: endISO,
            status: status,
            source: "booking_page",
            notes: notes.trim() || null,
          },
        ]);

      if (apptError) throw apptError;
      setStep(5);
    } catch (err) {
      console.error("Booking submission error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to submit booking. Please try again.";
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getFormatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const getFormatTime = (time24: string) => {
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  // Get display label for hours on selected day for a specific staff member
  const getStaffHoursLabel = (dayOfWeek: number) => {
    if (!selectedStaff || selectedStaff === "any" || selectedStaff === "") return null;
    const config = getEffectiveHours(dayOfWeek, selectedStaff);
    if (!config || config.is_closed) return "Closed";
    const fmt = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const ap = h >= 12 ? "PM" : "AM";
      return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ap}`;
    };
    return `${fmt(config.open_time)} – ${fmt(config.close_time)}`;
  };

  // Check if a day is fully unavailable for the selected staff context
  const isDayClosed = React.useCallback(
    (dayOfWeek: number): boolean => {
      if (selectedStaff !== "any" && selectedStaff !== "") {
        // Specific staff: closed if their hours say so
        const config = getEffectiveHours(dayOfWeek, selectedStaff);
        return !config || config.is_closed;
      }
      // "Any": closed only if EVERY active staff member is unavailable on this day
      if (staff.length === 0) {
        // Fall back to business hours
        const biz = workingHours.find((h) => h.day_of_week === dayOfWeek);
        return !biz || biz.is_closed;
      }
      return staff.every((s) => {
        const config = getEffectiveHours(dayOfWeek, s.id);
        return !config || config.is_closed;
      });
    },
    [selectedStaff, staff, getEffectiveHours, workingHours]
  );

  if (services.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <p className="font-semibold text-sm">No services are currently offered by this business.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Step Progress indicators */}
      {step < 5 && (
        <div className="mb-6 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4 select-none">
          <span className={step >= 1 ? "text-indigo-650 font-extrabold" : ""}>Service</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className={step >= 2 ? "text-indigo-650 font-extrabold" : ""}>Specialist</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className={step >= 3 ? "text-indigo-650 font-extrabold" : ""}>Date & Time</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className={step >= 4 ? "text-indigo-650 font-extrabold" : ""}>Your Info</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Select Service */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Select a Service</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose a specialization to book.</p>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceSelect(service)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-left flex justify-between items-center transition cursor-pointer hover:border-slate-350 hover:bg-white hover:shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-650 shrink-0">
                    <Scissors className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{service.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{service.duration_minutes} mins</p>
                  </div>
                </div>
                <span className="font-extrabold text-sm text-slate-900">{getCurrencySymbol(settings?.currency)}{Number(service.price).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Select Staff */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Choose a Specialist</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select a staff member or choose Any Staff.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleStaffSelect("any")}
              className="rounded-2xl border border-slate-205 bg-slate-50/50 p-4 text-left flex items-center gap-3.5 transition cursor-pointer hover:border-slate-350 hover:bg-white hover:shadow-sm active:scale-[0.99]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 font-bold text-xs select-none">
                AS
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Any Specialist</h4>
                <p className="text-xs text-slate-400 mt-0.5">First available staff member</p>
              </div>
            </button>

            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => handleStaffSelect(s.id)}
                className="rounded-2xl border border-slate-205 bg-slate-50/50 p-4 text-left flex items-center gap-3.5 transition cursor-pointer hover:border-slate-350 hover:bg-white hover:shadow-sm active:scale-[0.99]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 font-bold text-xs select-none">
                  {s.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{s.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{s.role || "Specialist"}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Select Date & Time */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Choose Date & Time</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a day and an open time slot
              {selectedStaff !== "any" && selectedStaff !== "" && (
                <> for <span className="font-semibold text-slate-700">{staff.find((s) => s.id === selectedStaff)?.name || "selected specialist"}</span></>
              )}.
            </p>
          </div>

          {/* Date Picker row */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar select-none">
            {dateList.map((date, idx) => {
              const dayOfWeek = date.getDay();
              const isClosed = isDayClosed(dayOfWeek);
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <button
                  key={idx}
                  onClick={() => !isClosed && handleDateSelect(date)}
                  disabled={isClosed}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-16.5 transition ${
                    isClosed
                      ? "border-slate-100 bg-slate-50/20 text-slate-300 cursor-not-allowed opacity-50"
                      : isSelected
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/10 cursor-pointer"
                      : "border-slate-200 bg-slate-50/20 text-slate-700 hover:bg-white hover:border-slate-350 cursor-pointer"
                  }`}
                >
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? "text-white/80" : isClosed ? "text-slate-300" : "text-slate-400"}`}>
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-sm font-extrabold mt-1">{date.getDate()}</span>
                  {isClosed && <span className="text-[8px] font-bold mt-0.5 text-slate-300">CLOSED</span>}
                </button>
              );
            })}
          </div>

          {/* Staff availability info for selected date */}
          {selectedDate && selectedStaff !== "any" && selectedStaff !== "" && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
              <span className="font-semibold text-slate-700">
                {staff.find((s) => s.id === selectedStaff)?.name}
              </span>
              &apos;s hours today:{" "}
              <span className="font-bold text-slate-800">
                {getStaffHoursLabel(selectedDate.getDay())}
              </span>
            </div>
          )}

          {/* Time Picker selection */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Available Slots
            </label>
            {selectedDate ? (
              availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/30 transition cursor-pointer active:scale-95"
                    >
                      {getFormatTime(time)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-slate-200 border-dashed rounded-2xl text-xs text-slate-400 bg-slate-50/20 select-none">
                  No availability on this day — all slots are booked or the business is closed.
                </div>
              )
            ) : (
              <div className="text-center py-6 border border-slate-200 border-dashed rounded-2xl text-xs text-slate-400 bg-slate-50/20 select-none">
                Please select a calendar date first.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Customer Details Form */}
      {step === 4 && (
        <form onSubmit={handleConfirmBooking} className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Your Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">Please provide your contact info to confirm booking.</p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User className="h-4 w-4" /></span>
                <input
                  type="text" required placeholder="e.g. Sophia Taylor"
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone className="h-4 w-4" /></span>
                  <input
                    type="tel" required placeholder="e.g. +1 (555) 123-4567"
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="h-4 w-4" /></span>
                  <input
                    type="email" placeholder="sophia@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5">Special Instructions</label>
              <div className="relative">
                <span className="absolute left-4 top-4.5 text-slate-400"><MessageSquare className="h-4 w-4" /></span>
                <textarea
                  placeholder="e.g. Any specific requests for your appointment..."
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button" onClick={() => setStep(3)} disabled={loading}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="submit" disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-95 cursor-pointer shadow-md shadow-indigo-500/10 disabled:opacity-50"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirming...</> : "Confirm Booking"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: Success Screen */}
      {step === 5 && (
        <div className="flex flex-col items-center justify-center text-center py-8 select-none animate-in fade-in slide-in-from-bottom-8 duration-200">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
            <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
          </div>

          <h3 className="text-xl font-bold text-slate-900">Booking Requested!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Thank you, {name.split(" ")[0]}. Your appointment has been recorded successfully.
            {settings.booking_approval_mode === "manual"
              ? " It is currently pending review by the host. We will notify you once confirmed."
              : " We have successfully added it to our calendar schedule."}
          </p>

          <div className="w-full max-w-sm rounded-2xl border border-slate-150 p-4 mt-6 bg-slate-50/50 text-xs text-slate-650 space-y-3 text-left shadow-inner">
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5">
              <span className="font-semibold text-slate-500">Service</span>
              <span className="font-bold text-slate-850">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5">
              <span className="font-semibold text-slate-500">Specialist</span>
              <span className="font-bold text-slate-850">
                {selectedStaff === "any"
                  ? "First Available"
                  : staff.find((s) => s.id === selectedStaff)?.name || "Specialist"}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5">
              <span className="font-semibold text-slate-500">Date</span>
              <span className="font-bold text-slate-850">{selectedDate ? getFormatDate(selectedDate) : ""}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-2.5">
              <span className="font-semibold text-slate-500">Time</span>
              <span className="font-bold text-slate-850">{getFormatTime(selectedTime)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500">Total Price</span>
              <span className="font-extrabold text-indigo-650 text-sm">{getCurrencySymbol(settings?.currency)}{Number(selectedService?.price).toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setSelectedService(null);
              setSelectedStaff("");
              setSelectedDate(null);
              setSelectedTime("");
              setName("");
              setPhone("");
              setEmail("");
              setNotes("");
            }}
            className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 cursor-pointer shadow-sm"
          >
            Book Another Appointment
          </button>
        </div>
      )}
    </div>
  );
}
