"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import { Loader2, Calendar } from "lucide-react";

interface UpcomingAppointment {
  time: string;
  name: string;
  service: string;
  staff: string;
  initials: string;
}

export default function Appointments() {
  const { business, settings } = useAuth();
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const fetchUpcoming = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            id,
            start_time,
            clients(name),
            services(name),
            staff(name)
          `)
          .eq("business_id", business.id)
          .gte("start_time", now)
          .order("start_time", { ascending: true })
          .limit(5);

        if (error) throw error;

        interface ApptRow {
          start_time: string;
          clients: { name: string } | null;
          services: { name: string } | null;
          staff: { name: string } | null;
        }

        if (data) {
          const mapped: UpcomingAppointment[] = (data as unknown as ApptRow[]).map((appt) => {
            const hasZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(appt.start_time);
            const cleanStr = hasZone ? appt.start_time : `${appt.start_time}Z`;
            const dateObj = new Date(cleanStr);
            const timeStr = dateObj.toLocaleTimeString("en-US", {
              timeZone: settings?.timezone || "UTC",
              hour: "2-digit",
              minute: "2-digit",
            });
            const clientName = appt.clients?.name || "Anonymous Client";
            const initials = clientName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "CL";

            return {
              time: timeStr,
              name: clientName,
              service: appt.services?.name || "Service",
              staff: `with ${appt.staff?.name || "Any Specialist"}`,
              initials,
            };
          });
          setAppointments(mapped);
        }
      } catch (err) {
        console.error("Error loading upcoming appointments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcoming();
  }, [business, settings]);

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Upcoming Appointments
          </h2>
          <p className="text-sm text-slate-500">
            Priority schedule for the next few hours.
          </p>
        </div>
        <Link
          href="/calendar"
          className="text-sm font-medium text-indigo-600 transition hover:text-indigo-900"
        >
          View calendar
        </Link>
      </div>

      <div className="h-72 overflow-auto scrollbar">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold mt-1">Checking appointments...</span>
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-3 mr-1">
            {appointments.map((appointment, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-3 hover:bg-white hover:border-slate-300 transition duration-150"
              >
                <p className="min-w-20 text-sm font-semibold text-slate-700">
                  {appointment.time}
                </p>

                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs select-none shadow-sm">
                    {appointment.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 leading-tight">
                      {appointment.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 mt-0.5">
                      {appointment.service}
                    </p>
                  </div>
                </div>

                <p className="hidden min-w-24 text-right text-xs font-bold text-slate-500 md:block">
                  {appointment.staff}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20 select-none">
            <Calendar className="h-9 w-9 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-500">No upcoming commitments today</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Direct clients to your booking link to schedule slots.</p>
          </div>
        )}
      </div>
    </div>
  );
}
