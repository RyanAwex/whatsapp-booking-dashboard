"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import Cards from "./Cards";
import CustomSelect from "./CustomSelect";

export interface CardProps {
  period: "today" | "week" | "month";
  title: string;
  type: "number" | "percentage" | "currency";
  value: number;
  statistics: string;
  nature: "increase" | "decrease" | "neutral";
}

export default function Hero() {
  const { business, profile } = useAuth();
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  // Metrics states
  const [apptsMetric, setApptsMetric] = useState({
    value: 0,
    change: "New",
    nature: "neutral" as "increase" | "decrease" | "neutral",
  });
  const [revenueMetric, setRevenueMetric] = useState({
    value: 0,
    change: "New",
    nature: "neutral" as "increase" | "decrease" | "neutral",
  });
  const [noShowMetric, setNoShowMetric] = useState({
    value: 0,
    change: "New",
    nature: "neutral" as "increase" | "decrease" | "neutral",
  });
  const [newClientsMetric, setNewClientsMetric] = useState({
    value: 0,
    change: "New",
    nature: "neutral" as "increase" | "decrease" | "neutral",
  });

  useEffect(() => {
    if (!business?.id) return;

    const fetchMetrics = async () => {
      try {
        // Sync past-ended appointments to the sales table before fetching metrics
        await supabase.rpc("sync_ended_appointments", {
          p_business_id: business.id,
        });

        const today = new Date();

        let currentStart = "";
        let currentEnd = "";
        let prevStart = "";
        let prevEnd = "";

        if (period === "today") {
          const startOfToday = new Date(today);
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date(today);
          endOfToday.setHours(23, 59, 59, 999);

          const startOfYesterday = new Date(startOfToday);
          startOfYesterday.setDate(startOfYesterday.getDate() - 1);
          const endOfYesterday = new Date(endOfToday);
          endOfYesterday.setDate(endOfYesterday.getDate() - 1);

          currentStart = startOfToday.toISOString();
          currentEnd = endOfToday.toISOString();
          prevStart = startOfYesterday.toISOString();
          prevEnd = endOfYesterday.toISOString();
        } else if (period === "week") {
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(today);
          monday.setDate(diff);
          monday.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(monday);
          endOfWeek.setDate(monday.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const startOfLastWeek = new Date(monday);
          startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
          const endOfLastWeek = new Date(endOfWeek);
          endOfLastWeek.setDate(endOfLastWeek.getDate() - 7);

          currentStart = monday.toISOString();
          currentEnd = endOfWeek.toISOString();
          prevStart = startOfLastWeek.toISOString();
          prevEnd = endOfLastWeek.toISOString();
        } else {
          // month
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
          );
          startOfMonth.setHours(0, 0, 0, 0);
          const endOfMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
          );
          endOfMonth.setHours(23, 59, 59, 999);

          const startOfLastMonth = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          startOfLastMonth.setHours(0, 0, 0, 0);
          const endOfLastMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            0,
          );
          endOfLastMonth.setHours(23, 59, 59, 999);

          currentStart = startOfMonth.toISOString();
          currentEnd = endOfMonth.toISOString();
          prevStart = startOfLastMonth.toISOString();
          prevEnd = endOfLastMonth.toISOString();
        }

        const calculateStat = (curr: number, prev: number) => {
          if (!prev || prev === 0) {
            return { change: "New", nature: "neutral" as const };
          }
          const pct = ((curr - prev) / prev) * 100;
          return {
            change: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
            nature:
              pct > 0
                ? ("increase" as const)
                : pct < 0
                  ? ("decrease" as const)
                  : ("neutral" as const),
          };
        };

        // 1. Appointments count
        const { count: currentAppts } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .gte("start_time", currentStart)
          .lte("start_time", currentEnd);

        const { count: prevAppts } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .gte("start_time", prevStart)
          .lte("start_time", prevEnd);

        const apptsStat = calculateStat(currentAppts || 0, prevAppts || 0);
        setApptsMetric({
          value: currentAppts || 0,
          change: apptsStat.change,
          nature: apptsStat.nature,
        });

        // 2. Revenue
        const { data: currentSales } = await supabase
          .from("sales")
          .select("amount")
          .eq("business_id", business.id)
          .eq("status", "paid")
          .gte("created_at", currentStart)
          .lte("created_at", currentEnd);

        const { data: prevSales } = await supabase
          .from("sales")
          .select("amount")
          .eq("business_id", business.id)
          .eq("status", "paid")
          .gte("created_at", prevStart)
          .lte("created_at", prevEnd);

        const currentRev =
          currentSales?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
        const prevRev =
          prevSales?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
        const revStat = calculateStat(currentRev, prevRev);
        setRevenueMetric({
          value: currentRev,
          change: revStat.change,
          nature: revStat.nature,
        });

        // 3. No-Show Rate
        const { data: currentApptsList } = await supabase
          .from("appointments")
          .select("status")
          .eq("business_id", business.id)
          .gte("start_time", currentStart)
          .lte("start_time", currentEnd);

        const { data: prevApptsList } = await supabase
          .from("appointments")
          .select("status")
          .eq("business_id", business.id)
          .gte("start_time", prevStart)
          .lte("start_time", prevEnd);

        const currentTotal = currentApptsList?.length || 0;
        const currentNoShows =
          currentApptsList?.filter((a) => a.status === "no_show").length || 0;
        const currentRate =
          currentTotal > 0 ? (currentNoShows / currentTotal) * 100 : 0;

        const prevTotal = prevApptsList?.length || 0;
        const prevNoShows =
          prevApptsList?.filter((a) => a.status === "no_show").length || 0;
        const prevRate = prevTotal > 0 ? (prevNoShows / prevTotal) * 100 : 0;

        // Note: For no-shows, lower is better.
        let noShowChange = "New";
        let noShowNature: "increase" | "decrease" | "neutral" = "neutral";
        if (prevTotal > 0) {
          const diff = currentRate - prevRate;
          noShowChange = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
          noShowNature =
            diff > 0 ? "decrease" : diff < 0 ? "increase" : "neutral"; // reverse for no-show (decrease is good!)
        }

        setNoShowMetric({
          value: parseFloat(currentRate.toFixed(1)),
          change: noShowChange,
          nature: noShowNature,
        });

        // 4. New Clients
        const { count: currentClients } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .gte("created_at", currentStart)
          .lte("created_at", currentEnd);

        const { count: prevClients } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .gte("created_at", prevStart)
          .lte("created_at", prevEnd);

        const clientsStat = calculateStat(
          currentClients || 0,
          prevClients || 0,
        );
        setNewClientsMetric({
          value: currentClients || 0,
          change: clientsStat.change,
          nature: clientsStat.nature,
        });
      } catch (err) {
        console.error("Error fetching dashboard hero metrics:", err);
      }
    };

    fetchMetrics();
  }, [business, period]);

  const cards: CardProps[] = [
    {
      title:
        period === "today"
          ? "Today's Appointments"
          : period === "week"
            ? "This Week's Appointments"
            : "This Month's Appointments",
      type: "number",
      value: apptsMetric.value,
      statistics: apptsMetric.change,
      nature: apptsMetric.nature,
      period: period,
    },
    {
      title:
        period === "today"
          ? "Revenue (Today)"
          : period === "week"
            ? "Revenue (This Week)"
            : "Revenue (This Month)",
      type: "currency",
      value: revenueMetric.value,
      statistics: revenueMetric.change,
      nature: revenueMetric.nature,
      period: period,
    },
    {
      title:
        period === "today"
          ? "No-Show Rate (Today)"
          : period === "week"
            ? "No-Show Rate (This Week)"
            : "No-Show Rate (This Month)",
      type: "percentage",
      value: noShowMetric.value,
      statistics: noShowMetric.change,
      nature: noShowMetric.nature,
      period: period,
    },
    {
      title:
        period === "today"
          ? "New Clients (Today)"
          : period === "week"
            ? "New Clients (This Week)"
            : "New Clients (This Month)",
      type: "number",
      value: newClientsMetric.value,
      statistics: newClientsMetric.change,
      nature: newClientsMetric.nature,
      period: period,
    },
  ];

  const currentDate = new Date();
  const userName = profile?.name || "Partner";

  return (
    <section className="mb-8 flex flex-col gap-5">
      <div className="relative z-20 flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_20px_20px_-24px_rgba(15,23,42,0.35)] backdrop-blur sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="space-y-2">
          <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Operations overview
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">
              Welcome back, {userName}. Here is your executive snapshot.
            </p>
          </div>
        </div>

        <CustomSelect
          options={[
            {
              value: "today",
              label: `Today, ${currentDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`,
            },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
          ]}
          value={period}
          onChange={(val) => setPeriod(val as "today" | "week" | "month")}
        />
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
