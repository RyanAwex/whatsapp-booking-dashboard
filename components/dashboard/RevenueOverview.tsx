"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Loader2 } from "lucide-react";

interface ChartData {
  day: string;
  revenue: number;
}

export default function RevenueOverview() {
  const { business } = useAuth();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const fetchWeeklyTrend = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const startOfWeek = new Date();
        startOfWeek.setDate(today.getDate() - 6);
        startOfWeek.setHours(0, 0, 0, 0);

        // Fetch sales paid in the last 7 days
        const { data: sales, error } = await supabase
          .from("sales")
          .select("amount, created_at")
          .eq("business_id", business.id)
          .eq("status", "paid")
          .gte("created_at", startOfWeek.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Group sales by day of the week
        const daysMap: { [key: string]: number } = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(startOfWeek.getDate() + i);
          const dayLabel = d.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
          });
          daysMap[dayLabel] = 0;
        }

        interface SaleRow {
          amount: number;
          created_at: string;
        }

        if (sales) {
          (sales as unknown as SaleRow[]).forEach((sale) => {
            const saleDate = new Date(sale.created_at);
            const label = saleDate.toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
            });
            if (daysMap[label] !== undefined) {
              daysMap[label] += Number(sale.amount);
            }
          });
        }

        const chartData: ChartData[] = Object.keys(daysMap).map((key) => ({
          day: key,
          revenue: daysMap[key],
        }));

        setData(chartData);

      } catch (err) {
        console.error("Error loading revenue chart data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyTrend();
  }, [business]);

  // Compute dynamic max for the YAxis
  const maxRevenue = data.reduce((max, d) => (d.revenue > max ? d.revenue : max), 100);
  const yDomainMax = Math.ceil(maxRevenue / 500) * 500;

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Revenue Overview
          </h2>
          <p className="text-sm text-slate-500">
            Weekly sales and transaction volumes.
          </p>
        </div>

        <div className="relative">
          <select
            name="date"
            id="date_select"
            className="flex w-full appearance-none items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none"
          >
            <option value="week">Last 7 Days</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            size={16}
          />
        </div>
      </div>

      <div className="h-60 w-full flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-650" />
            <span className="text-xs font-semibold mt-1">Analyzing transactions...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey="day"
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                tick={{ fill: "#374151", fontSize: 11, fontWeight: 500 }}
                dy={10}
              />

              <YAxis
                domain={[0, yDomainMax]}
                tickFormatter={(value) => `$${value}`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#374151", fontSize: 11, fontWeight: 600 }}
                width={50}
              />

              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]} />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                dot={{ r: 5, fill: "white", stroke: "#6366f1", strokeWidth: 2 }}
                activeDot={{
                  r: 6,
                  fill: "white",
                  stroke: "#6366f1",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
