"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import Cards from "./Cards";

export interface CardProps {
  period: "today" | "week" | "month";
  title: string;
  type: "number" | "percentage" | "currency";
  value: number;
  statistics: number;
  nature: "increase" | "decrease";
}

export default function Hero() {
  const { business, profile } = useAuth();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  // Metrics states
  const [todayAppts, setTodayAppts] = useState({ value: 0, change: 0, nature: "increase" as "increase" | "decrease" });
  const [monthRevenue, setMonthRevenue] = useState({ value: 0, change: 0, nature: "increase" as "increase" | "decrease" });
  const [noShowRate, setNoShowRate] = useState({ value: 0, change: 0, nature: "decrease" as "increase" | "decrease" });
  const [newClients, setNewClients] = useState({ value: 0, change: 0, nature: "increase" as "increase" | "decrease" });

  useEffect(() => {
    if (!business?.id) return;

    const fetchMetrics = async () => {
      try {
        const today = new Date();

        // 1. Today's appointments count
        const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfToday = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { count: currentTodayCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .gte("start_time", startOfToday)
          .lte("start_time", endOfToday);

        setTodayAppts({
          value: currentTodayCount || 0,
          change: 12, // mock comparative stat
          nature: (currentTodayCount || 0) >= 2 ? "increase" : "decrease",
        });

        // 2. Monthly Revenue
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const { data: salesData } = await supabase
          .from("sales")
          .select("amount")
          .eq("business_id", business.id)
          .eq("status", "paid")
          .gte("created_at", startOfMonth);

        const revValue = salesData?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
        setMonthRevenue({
          value: revValue,
          change: 8,
          nature: revValue > 500 ? "increase" : "decrease",
        });

        // 3. No-Show Rate
        const { data: apptsThisMonth } = await supabase
          .from("appointments")
          .select("status")
          .eq("business_id", business.id)
          .gte("start_time", startOfMonth);

        const totalMonthAppts = apptsThisMonth?.length || 0;
        const noShowAppts = apptsThisMonth?.filter((a) => a.status === "no_show").length || 0;
        const rate = totalMonthAppts > 0 ? parseFloat(((noShowAppts / totalMonthAppts) * 100).toFixed(1)) : 0.0;

        setNoShowRate({
          value: rate,
          change: 0.5,
          nature: rate > 5 ? "increase" : "decrease",
        });

        // 4. New Clients
        const { count: clientsCount } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .gte("created_at", startOfMonth);

        setNewClients({
          value: clientsCount || 0,
          change: 4,
          nature: (clientsCount || 0) > 0 ? "increase" : "decrease",
        });

      } catch (err) {
        console.error("Error fetching dashboard hero metrics:", err);
      }
    };

    fetchMetrics();
  }, [business, period]);

  const cards: CardProps[] = [
    {
      title: "Today's Appointments",
      type: "number",
      value: todayAppts.value,
      statistics: todayAppts.change,
      nature: todayAppts.nature,
      period: "today",
    },
    {
      title: "Revenue (This Month)",
      type: "currency",
      value: monthRevenue.value,
      statistics: monthRevenue.change,
      nature: monthRevenue.nature,
      period: "month",
    },
    {
      title: "No-Show Rate (This Month)",
      type: "percentage",
      value: noShowRate.value,
      statistics: noShowRate.change,
      nature: noShowRate.nature,
      period: "month",
    },
    {
      title: "New Clients (This Month)",
      type: "number",
      value: newClients.value,
      statistics: newClients.change,
      nature: newClients.nature,
      period: "month",
    },
  ];

  const currentDate = new Date();
  const userName = profile?.name || "Partner";

  return (
    <section className="mb-8 flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_20px_20px_-24px_rgba(15,23,42,0.35)] backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Operations overview
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">
              Welcome back, {userName}. Here is your executive snapshot for today.
            </p>
          </div>
        </div>

        <div className="relative">
          <select
            name="date"
            id="date_select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as "today" | "week" | "month")}
            className="flex w-full appearance-none items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:bg-slate-100 cursor-pointer"
          >
            <option value="today">
              Today,{" "}
              {currentDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            size={16}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Cards
            period={card.period}
            key={card.title}
            title={card.title}
            type={card.type}
            value={card.value}
            statistics={card.statistics}
            nature={card.nature}
          />
        ))}
      </div>
    </section>
  );
}
