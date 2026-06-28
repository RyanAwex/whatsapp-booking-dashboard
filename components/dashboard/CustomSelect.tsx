"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:bg-slate-100 cursor-pointer select-none text-left min-w-[140px]"
      >
        <span className="truncate font-semibold text-slate-800">
          {selectedOption ? selectedOption.label : "Select..."}
        </span>
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 z-[999] w-full min-w-[160px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_24px_-4px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition cursor-pointer text-xs ${
                  isSelected
                    ? "bg-indigo-50/70 text-[#0f294a] font-bold"
                    : "text-slate-655 hover:bg-slate-50 hover:text-slate-850"
                }`}
              >
                <span className="truncate font-semibold">{opt.label}</span>
                {isSelected && <Check className="size-3.5 text-indigo-650 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
