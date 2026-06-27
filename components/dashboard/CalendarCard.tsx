"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const days = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarCard() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 1. Get first day of current month (e.g. Wednesday = 3)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // 2. Get total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // 3. Get total days in previous month
  const prevTotalDays = new Date(year, month, 0).getDate();

  const gridDates: { date: number; isMuted: boolean; isToday: boolean }[] = [];
  const today = new Date();

  // Fill previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    gridDates.push({
      date: prevTotalDays - i,
      isMuted: true,
      isToday: false,
    });
  }

  // Fill current month days
  for (let i = 1; i <= totalDays; i++) {
    const isToday =
      today.getDate() === i &&
      today.getMonth() === month &&
      today.getFullYear() === year;

    gridDates.push({
      date: i,
      isMuted: false,
      isToday,
    });
  }

  // Fill next month padding days to complete grid (multiples of 7, let's target 35 or 42)
  const totalSlots = gridDates.length > 35 ? 42 : 35;
  const nextMonthPadding = totalSlots - gridDates.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    gridDates.push({
      date: i,
      isMuted: true,
      isToday: false,
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Calendar</h2>
          <p className="text-sm text-slate-500">
            Upcoming commitments and key dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-slate-700">{monthLabel}</p>

          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="flex size-9 items-center justify-center text-slate-655 transition hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="flex size-9 items-center justify-center border-l border-slate-200 text-slate-655 transition hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-3 text-center">
        {days.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400"
          >
            {day}
          </div>
        ))}

        {gridDates.map((item, index) => {
          return (
            <button
              key={`${item.date}-${index}`}
              className={`mx-auto flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
                item.isToday
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                  : item.isMuted
                    ? "text-slate-400"
                    : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.date}
            </button>
          );
        })}
      </div>
    </div>
  );
}
