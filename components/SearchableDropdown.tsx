"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  label,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openDirection, setOpenDirection] = useState<"down" | "up">("down");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside and clear search query
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input and determine open direction when opened
  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // If there's less than 340px below and more space above, open upwards
        if (spaceBelow < 340 && spaceAbove > spaceBelow) {
          setOpenDirection("up");
        } else {
          setOpenDirection("down");
        }
      }
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.value.toLowerCase().includes(search.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (!next) setSearch("");
        }}
        className="w-full flex items-center justify-between rounded-xl border border-slate-205 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-750 outline-none hover:bg-slate-100/50 hover:border-slate-350 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-55 transition duration-200 cursor-pointer text-left"
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="font-semibold text-slate-900 truncate">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`size-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          className={`absolute z-[999] w-full min-w-[280px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_-4px_rgba(15,23,42,0.15),0_4px_12px_rgba(15,23,42,0.05)] backdrop-blur-md animate-in fade-in duration-150 max-h-[340px] flex flex-col ${
            openDirection === "up"
              ? "bottom-full mb-2 slide-in-from-bottom-2"
              : "top-full mt-2 slide-in-from-top-2"
          }`}
        >
          {/* Search Box */}
          <div className="relative flex items-center mb-2 px-1 py-1 border-b border-slate-100">
            <Search className="absolute left-3 size-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50/60 rounded-lg text-xs font-medium text-slate-700 outline-none border border-slate-150 focus:border-indigo-400 focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 pr-0.5 space-y-0.5 scrollbar max-h-[220px]">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const isCurrencyCode = opt.value.length === 3 && opt.value === opt.value.toUpperCase();

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition cursor-pointer text-xs ${
                      isSelected
                        ? "bg-indigo-50/70 text-indigo-900 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        {isCurrencyCode && (
                          <span className="font-extrabold uppercase text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {opt.value}
                          </span>
                        )}
                        <span className="text-slate-800 font-semibold truncate">
                          {opt.label}
                        </span>
                      </div>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 leading-none">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="size-3.5 text-indigo-600 stroke-[3.5] shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
