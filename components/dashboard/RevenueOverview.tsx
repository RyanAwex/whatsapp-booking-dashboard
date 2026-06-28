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
import { Loader2 } from "lucide-react";
import CustomSelect from "./CustomSelect";
import { getCurrencySymbol } from "@/lib/constants";

interface ChartData {
  day: string;
  revenue: number;
}

export default function RevenueOverview() {
  const { business, settings } = useAuth();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"week" | "month" | "year">("week");

  useEffect(() => {
    if (!business?.id) return;

    const fetchRevenueTrend = async () => {
      setLoading(true);
      try {
        await supabase.rpc("sync_ended_appointments", {
          p_business_id: business.id,
        });

        const today = new Date();
        const startDate = new Date();

        if (range === "week") {
          startDate.setDate(today.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
        } else if (range === "month") {
          startDate.setDate(today.getDate() - 29);
          startDate.setHours(0, 0, 0, 0);
        } else {
          // year
          startDate.setMonth(today.getMonth() - 11);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
        }

        // Fetch sales paid in the selected duration
        const { data: sales, error } = await supabase
          .from("sales")
          .select("amount, created_at")
          .eq("business_id", business.id)
          .eq("status", "paid")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Group sales based on the selected duration
        const dataMap: Record<string, number> = {};

        if (range === "week") {
          for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const label = d.toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
            });
            dataMap[label] = 0;
          }
          if (sales) {
            sales.forEach((sale) => {
              const saleDate = new Date(sale.created_at);
              const label = saleDate.toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
              });
              if (dataMap[label] !== undefined) {
                dataMap[label] += Number(sale.amount);
              }
            });
          }
        } else if (range === "month") {
          for (let i = 0; i < 30; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const label = d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            dataMap[label] = 0;
          }
          if (sales) {
            sales.forEach((sale) => {
              const saleDate = new Date(sale.created_at);
              const label = saleDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              if (dataMap[label] !== undefined) {
                dataMap[label] += Number(sale.amount);
              }
            });
          }
        } else {
          // year
          for (let i = 0; i < 12; i++) {
            const d = new Date(startDate);
            d.setMonth(startDate.getMonth() + i);
            const label = d.toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            });
            dataMap[label] = 0;
          }
          if (sales) {
            sales.forEach((sale) => {
              const saleDate = new Date(sale.created_at);
              const label = saleDate.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              });
              if (dataMap[label] !== undefined) {
                dataMap[label] += Number(sale.amount);
              }
            });
          }
        }

        const chartData: ChartData[] = Object.keys(dataMap).map((key) => ({
          day: key,
          revenue: dataMap[key],
        }));

        setData(chartData);
      } catch (err) {
        console.error("Error loading revenue chart data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueTrend();
  }, [business, range]);

  // Compute dynamic max for the YAxis
  const maxRevenue = data.reduce(
    (max, d) => (d.revenue > max ? d.revenue : max),
    100,
  );
  const yDomainMax = Math.ceil(maxRevenue / 500) * 500;

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Revenue Overview
          </h2>
          <p className="text-sm text-slate-500">
            {range === "week"
              ? "Weekly sales trend and transaction volume."
              : range === "month"
                ? "Monthly sales trend and transaction volume."
                : "Yearly sales trend and transaction volume."}
          </p>
        </div>

        <CustomSelect
          options={[
            { value: "week", label: "Last 7 Days" },
            { value: "month", label: "Last 30 Days" },
            { value: "year", label: "Last 12 Months" },
          ]}
          value={range}
          onChange={(val) => setRange(val as "week" | "month" | "year")}
        />
      </div>

      <div className="h-60 w-full flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-650" />
            <span className="text-xs font-semibold mt-1">
              Analyzing transactions...
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey="day"
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                tick={{
                  fill: "#374151",
                  fontSize: range === "month" ? 9 : 11,
                  fontWeight: 500,
                }}
                dy={10}
              />

              <YAxis
                domain={[0, yDomainMax]}
                tickFormatter={(value) => `${getCurrencySymbol(settings?.currency)}${value}`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#374151", fontSize: 11, fontWeight: 600 }}
                width={50}
              />

              <Tooltip
                formatter={(value) => [
                  `${getCurrencySymbol(settings?.currency)}${Number(value).toFixed(2)}`,
                  "Revenue",
                ]}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                dot={{
                  r: range === "month" ? 2 : 4,
                  fill: "white",
                  stroke: "#6366f1",
                  strokeWidth: 2,
                }}
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
