"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import { Loader2, Users2, Calendar } from "lucide-react";

interface StaffStatusInfo {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: "Available" | "Busy" | "Break" | "Off";
  detail: string;
}

export default function StaffAvailability() {
  const { business } = useAuth();
  const [staffList, setStaffList] = useState<StaffStatusInfo[]>([]);
  const [bookedPercentage, setBookedPercentage] = useState(0);
  const [remainingSlots, setRemainingSlots] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        // 1. Fetch active staff
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name, role")
          .eq("business_id", business.id)
          .eq("status", "active");

        if (!staffData || staffData.length === 0) {
          setStaffList([]);
          setBookedPercentage(0);
          setRemainingSlots(0);
          setLoading(false);
          return;
        }

        // 2. Fetch today's appointments
        const { data: apptsData } = await supabase
          .from("appointments")
          .select("id, staff_id, start_time, end_time, status, services(name)")
          .eq("business_id", business.id)
          .gte("start_time", startOfToday.toISOString())
          .lte("start_time", endOfToday.toISOString());

        // 3. Fetch working hours for today to see if anyone is Off today
        const dayOfWeek = now.getDay();
        const { data: whData } = await supabase
          .from("working_hours")
          .select("staff_id, is_closed, open_time, close_time")
          .eq("business_id", business.id)
          .eq("day_of_week", dayOfWeek);

        const whMap = new Map(
          whData?.map((w) => [
            w.staff_id,
            { is_closed: w.is_closed, open_time: w.open_time, close_time: w.close_time },
          ]) || []
        );

        const nowTime = now.getTime();
        const nowHours = now.getHours();
        const nowMinutes = now.getMinutes();
        const nowSeconds = now.getSeconds();
        const currentLocalSecs = nowHours * 3600 + nowMinutes * 60 + nowSeconds;

        const timeToSeconds = (timeStr: string | null) => {
          if (!timeStr) return 0;
          const parts = timeStr.split(":");
          const h = parseInt(parts[0]) || 0;
          const m = parseInt(parts[1]) || 0;
          const s = parseInt(parts[2]) || 0;
          return h * 3600 + m * 60 + s;
        };

        const formatTimeStr = (timeStr: string | null) => {
          if (!timeStr) return "";
          const parts = timeStr.split(":");
          const h = parseInt(parts[0]) || 0;
          const m = parts[1] || "00";
          const ampm = h >= 12 ? "PM" : "AM";
          const displayH = h % 12 || 12;
          return `${displayH}:${m} ${ampm}`;
        };

        const list: StaffStatusInfo[] = staffData.map((s) => {
          const initials = s.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          const whInfo = whMap.get(s.id);

          // Check if Off today
          if (!whInfo || whInfo.is_closed === true) {
            return {
              id: s.id,
              name: s.name,
              role: s.role || "Specialist",
              initials,
              status: "Off",
              detail: "Off today",
            };
          }

          const openSecs = timeToSeconds(whInfo.open_time) || 9 * 3600; // default 9 AM
          const closeSecs = timeToSeconds(whInfo.close_time) || 17 * 3600; // default 5 PM

          // Check shift times
          if (currentLocalSecs < openSecs) {
            return {
              id: s.id,
              name: s.name,
              role: s.role || "Specialist",
              initials,
              status: "Off",
              detail: `Starts at ${formatTimeStr(whInfo.open_time || "09:00:00")}`,
            };
          }

          if (currentLocalSecs > closeSecs) {
            return {
              id: s.id,
              name: s.name,
              role: s.role || "Specialist",
              initials,
              status: "Off",
              detail: "Shift ended",
            };
          }

          // Find if there is a current active appointment right now
          const currentAppt = apptsData?.find((a) => {
            if (a.staff_id !== s.id || a.status === "cancelled" || a.status === "no_show") return false;
            const start = new Date(a.start_time).getTime();
            const end = new Date(a.end_time).getTime();
            return nowTime >= start && nowTime <= end;
          });

          if (currentAppt) {
            const endHour = new Date(currentAppt.end_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            const servicesVal = currentAppt.services;
            let serviceName = "";
            if (servicesVal) {
              if (Array.isArray(servicesVal)) {
                const sObj = servicesVal[0] as { name: string } | undefined;
                serviceName = sObj?.name || "";
              } else {
                const sObj = servicesVal as unknown as { name: string };
                serviceName = sObj?.name || "";
              }
            }

            return {
              id: s.id,
              name: s.name,
              role: serviceName || s.role || "Specialist",
              initials,
              status: "Busy",
              detail: `Busy until ${endHour}`,
            };
          }

          // Lunch Break check (systematic lunch break between 1:00 PM and 2:00 PM, i.e. hour 13)
          if (nowHours === 13) {
            return {
              id: s.id,
              name: s.name,
              role: s.role || "Specialist",
              initials,
              status: "Break",
              detail: "Break ends 2:00 PM",
            };
          }

          return {
            id: s.id,
            name: s.name,
            role: s.role || "Specialist",
            initials,
            status: "Available",
            detail: "Free now",
          };
        });

        setStaffList(list);

        // Calculate booked capacity stats dynamically
        const activeApptsCount = apptsData?.filter((a) => a.status !== "cancelled" && a.status !== "no_show").length || 0;
        const totalSlotsCapacity = staffData.length * 6; // Assume 6 slots per staff member per day
        const bookedPct = Math.min(Math.round((activeApptsCount / totalSlotsCapacity) * 100), 100);
        const openSlots = Math.max(totalSlotsCapacity - activeApptsCount, 0);

        setBookedPercentage(bookedPct || 10); // Minimum 10% for layout visibility
        setRemainingSlots(openSlots);

      } catch (err) {
        console.error("Error loading staff availability:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [business]);

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Staff Availability</h2>
          <p className="text-sm text-slate-500">Live team status and today&apos;s capacity.</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl select-none">
          <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white rounded-lg shadow-sm flex items-center gap-1">
            <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Today
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-650 mb-1" />
          <span className="text-xs font-semibold">Updating status...</span>
        </div>
      ) : staffList.length > 0 ? (
        <div className="flex-1 flex flex-col justify-between gap-6">
          {/* Staff List */}
          <div className="space-y-3.5">
            {staffList.slice(0, 4).map((staff) => {
              const statusColors = {
                Available: "bg-emerald-50 text-emerald-700 border-emerald-100/80",
                Busy: "bg-amber-50 text-amber-700 border-amber-100/80",
                Break: "bg-orange-50 text-orange-700 border-orange-100/80",
                Off: "bg-slate-50 text-slate-550 border-slate-200/60",
              };

              const dotColors = {
                Available: "bg-emerald-500",
                Busy: "bg-amber-500",
                Break: "bg-orange-500",
                Off: "bg-slate-400",
              };

              return (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50/50 transition duration-150 border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 bg-[#0f294a] text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-sm shadow-[#0f294a]/10 shrink-0">
                      {staff.initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{staff.name}</h4>
                      <p className="text-[11px] text-slate-450 font-medium truncate">{staff.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border flex items-center gap-1.5 select-none ${
                        statusColors[staff.status]
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${dotColors[staff.status]}`} />
                      {staff.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 min-w-[100px] text-right">
                      {staff.detail}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today's Capacity */}
          <div className="border-t border-slate-100 pt-4 mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">
                Today&apos;s Capacity
              </span>
              <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {bookedPercentage}% booked
              </span>
            </div>
            
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-650 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${bookedPercentage}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 mt-2 font-medium flex items-center gap-1 select-none">
              <Calendar className="size-3.5 text-slate-400" />
              {remainingSlots} open slots remaining today.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-6 select-none">
          <Users2 className="size-10 text-slate-300 stroke-[1.5] mb-2 animate-pulse" />
          <h3 className="font-bold text-slate-800 text-sm">No Active Staff</h3>
          <p className="text-xs text-slate-455 mt-1 max-w-xs">
            Add staff members in the control center to display status and capacity updates here.
          </p>
        </div>
      )}
    </div>
  );
}
