"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import {
  CalendarCheck,
  CircleDollarSign,
  UserRoundCheck,
  XCircle,
  Loader2,
  Bell,
} from "lucide-react";

interface ActivityItem {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  time: string;
  color: string;
  timestamp: number;
}

export default function RecentActivity() {
  const { business } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to format relative time
  const getRelativeTime = (isoString: string) => {
    const now = new Date();
    const past = new Date(isoString);
    const diffMs = now.getTime() - past.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    if (!business?.id) return;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        await supabase.rpc("sync_ended_appointments", { p_business_id: business.id });

        // 1. Fetch latest 5 appointments
        const { data: appts } = await supabase
          .from("appointments")
          .select("created_at, status, clients(name), services(name)")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(5);

        // 2. Fetch latest 5 sales
        const { data: sales } = await supabase
          .from("sales")
          .select("created_at, status, amount, clients(name)")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const items: ActivityItem[] = [];

        interface ApptActivity {
          created_at: string;
          status: string;
          clients: { name: string } | null;
          services: { name: string } | null;
        }

        // Map appointments
        if (appts) {
          (appts as unknown as ApptActivity[]).forEach((a) => {
            const clientName = a.clients?.name || "Client";
            const serviceName = a.services?.name || "Service";
            let text = "";
            let icon = UserRoundCheck;
            let color = "text-blue-600";

            if (a.status === "pending") {
              text = `New request: ${clientName} booked ${serviceName}`;
              icon = UserRoundCheck;
              color = "text-blue-500";
            } else if (a.status === "confirmed") {
              text = `Confirmed: ${clientName} for ${serviceName}`;
              icon = CalendarCheck;
              color = "text-indigo-650";
            } else if (a.status === "completed") {
              text = `Completed: ${clientName} (${serviceName})`;
              icon = CalendarCheck;
              color = "text-emerald-600";
            } else if (a.status === "no_show") {
              text = `No-show: ${clientName} missed appointment`;
              icon = XCircle;
              color = "text-rose-500";
            } else if (a.status === "cancelled") {
              text = `Canceled: ${clientName} appointment`;
              icon = XCircle;
              color = "text-rose-500";
            }

            items.push({
              icon,
              text,
              time: getRelativeTime(a.created_at),
              color,
              timestamp: new Date(a.created_at).getTime(),
            });
          });
        }

        interface SaleActivity {
          created_at: string;
          status: string;
          amount: number;
          clients: { name: string } | null;
        }

        // Map sales
        if (sales) {
          (sales as unknown as SaleActivity[]).forEach((s) => {
            const clientName = s.clients?.name || "Client";
            const amount = Number(s.amount).toFixed(0);
            let text = "";
            let color = "text-emerald-600";

            if (s.status === "paid") {
              text = `Payment of $${amount} received from ${clientName}`;
              color = "text-emerald-600";
            } else if (s.status === "refunded") {
              text = `Refund of $${amount} issued to ${clientName}`;
              color = "text-amber-500";
            } else if (s.status === "pending") {
              text = `Invoice pending: $${amount} for ${clientName}`;
              color = "text-slate-500";
            } else if (s.status === "cancelled") {
              text = `Invoice canceled for ${clientName}`;
              color = "text-rose-500";
            }

            items.push({
              icon: CircleDollarSign,
              text,
              time: getRelativeTime(s.created_at),
              color,
              timestamp: new Date(s.created_at).getTime(),
            });
          });
        }

        // Sort combined list by timestamp descending
        items.sort((a, b) => b.timestamp - a.timestamp);
        setActivities(items.slice(0, 10)); // keep latest 10

      } catch (err) {
        console.error("Error fetching recent activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [business]);

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Activity
          </h2>
          <p className="text-sm text-slate-500">
            Latest milestones and client actions.
          </p>
        </div>

        <button className="text-sm font-medium text-indigo-650 transition hover:text-indigo-900">
          View all activity
        </button>
      </div>

      <div className="h-72 space-y-3 overflow-auto scrollbar pr-1">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-650" />
            <span className="text-xs font-semibold mt-1">Fetching activity logs...</span>
          </div>
        ) : activities.length > 0 ? (
          activities.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-3 hover:bg-white hover:border-slate-300 transition duration-150"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
                    <Icon className={`size-5 shrink-0 ${activity.color}`} />
                  </div>
                  <p className="truncate text-sm font-medium text-slate-700">
                    {activity.text}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                  {activity.time}
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20 select-none">
            <Bell className="h-9 w-9 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-500">No activity logs recorded yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Activities will trigger automatically when appointments or payments are registered.</p>
          </div>
        )}
      </div>
    </div>
  );
}
