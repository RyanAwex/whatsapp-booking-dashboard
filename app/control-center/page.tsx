"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import SearchableDropdown from "@/components/SearchableDropdown";
import {
  TIMEZONES,
  CURRENCIES,
  CATEGORIES,
  SYSTEM_ROLES,
} from "@/lib/constants";
import {
  Building,
  CalendarClock,
  Users,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";

// Mock QR Code Component using SVG
const MockQRCode = () => (
  <svg
    viewBox="0 0 100 100"
    className="size-44 text-slate-800"
    fill="currentColor"
  >
    <path d="M0 0h30v10H10v20H0V0zm70 0h30v30h-10V10H70V0zM0 70h10v20h20v10H0V70zm100 30H70v-10h20V70h10v30z" />
    <path d="M5 5h20v20H5V5zm4 4v12h12V9H9z" />
    <path d="M12 12h6v6h-6v-6z" />
    <path d="M75 5h20v20H75V5zm4 4v12h12V9H79z" />
    <path d="M82 12h6v6h-6v-6z" />
    <path d="M5 75h20v20H5V75zm4 4v12h12V79H9z" />
    <path d="M12 82h6v6h-6v-6z" />
    <path d="M35 10h5v5h-5zm10 0h10v5H45zm15 0h5v10h-5zm0 15h5v5h-5zm-25 5h5v5h-5zm10 0h5v10h-5zm15 0h5v5h-5zM35 45h10v5H35zm15 5h10v5H50zm15-5h5v10h-5z" />
    <path d="M35 60h5v5h-5zm10 5h5v5h-5zm15-5h10v5H60zm15 5h5v10h-5zm0 15h5v5h-5zM45 75h5v10h-5zm15 0h10v5H60zm15 8h5v5h-5z" />
  </svg>
);

interface CustomTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  minTime,
  maxTime,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayVal = value ? value.slice(0, 5) : "09:00";

  // Generate 30-min options
  const options = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, "0");
    const m = i % 2 === 0 ? "00" : "30";
    return `${h}:${m}`;
  });

  // Check clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(`${opt}:00`);
    setIsOpen(false);
  };

  // Determine if it should open upwards based on screen space
  const [openUpward, setOpenUpward] = useState(false);
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 200px below, open upward
      setOpenUpward(spaceBelow < 200);
    }
  }, [isOpen]);

  const minStr = minTime ? minTime.slice(0, 5) : null;
  const maxStr = maxTime ? maxTime.slice(0, 5) : null;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-xl border border-slate-250 bg-slate-50/50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 transition cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <span>{displayVal}</span>
        <svg className="size-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-32 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.25)] backdrop-blur max-h-52 overflow-y-auto ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {options.map((opt) => {
            const isAllowed = (!minStr || opt >= minStr) && (!maxStr || opt <= maxStr);
            const isSelected = opt === displayVal;

            return (
              <button
                key={opt}
                type="button"
                disabled={!isAllowed}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  !isAllowed
                    ? "text-slate-350 bg-transparent cursor-not-allowed opacity-40"
                    : isSelected
                    ? "bg-[#0f294a] text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface StaffMember {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "active" | "inactive";
  email?: string;
  system_role?: "owner" | "admin" | "staff";
  user_id?: string;
}

interface WorkingHour {
  id?: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  max_staff: number;
  max_services: number;
  max_clients: number;
  max_appointments: number;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ControlCenterPage() {
  const { business, subscription, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("Business Info");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Business Info States
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("beauty_salon");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");

  // Settings States
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");
  const [bookingSlug, setBookingSlug] = useState("");
  const [approvalMode, setApprovalMode] = useState("automatic");
  const [allowCancel, setAllowCancel] = useState(true);
  const [cancelLimit, setCancelLimit] = useState(24);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("cash");

  // Working Hours States
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);

  // Staff States
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Senior Stylist");
  const [newStaffDesc, setNewStaffDesc] = useState("");

  // Add Staff States
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffSystemRole, setNewStaffSystemRole] = useState<
    "owner" | "admin" | "staff"
  >("staff");

  // Edit Staff States
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffRole, setEditStaffRole] = useState("Senior Stylist");
  const [editStaffDesc, setEditStaffDesc] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffSystemRole, setEditStaffSystemRole] = useState<
    "owner" | "admin" | "staff"
  >("staff");
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);

  // Staff-specific Working Hours States
  const [staffHoursMap, setStaffHoursMap] = useState<
    Record<string, WorkingHour[]>
  >({}); // keyed by staff id
  const [staffHoursOpen, setStaffHoursOpen] = useState<string | null>(null); // staff id whose hours panel is open
  const [savingStaffHours, setSavingStaffHours] = useState(false);

  // Plans States
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [switchingPlanId, setSwitchingPlanId] = useState<string | null>(null);

  // WhatsApp Connection States
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const tabs = [
    "Business Info",
    "Working Hours",
    "Staff",
    "WhatsApp Connection",
    "Billing & Plan",
  ];

  // Load states for tabs
  const [loadingHours, setLoadingHours] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // 1. Fetch Business Info & Settings
  const fetchBusinessInfo = React.useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      setBizName(business.name || "");
      setBizCategory(business.category || "beauty_salon");
      setBizPhone(business.phone || "");
      setBizAddress(business.address || "");

      const { data: settingsData } = await supabase
        .from("business_settings")
        .select("*")
        .eq("business_id", business.id)
        .maybeSingle();

      if (settingsData) {
        setTimezone(settingsData.timezone || "UTC");
        setCurrency(settingsData.currency || "USD");
        setBookingSlug(settingsData.booking_page_slug || "");
        setApprovalMode(settingsData.booking_approval_mode || "automatic");
        setAllowCancel(settingsData.allow_client_cancel ?? true);
        setCancelLimit(settingsData.cancel_limit_hours ?? 24);
        setDefaultPaymentMethod(settingsData.default_payment_method || "cash");
      }
    } catch (err) {
      console.error("Error loading business info:", err);
      setErrorMsg("Failed to load business profile details.");
    } finally {
      setLoading(false);
    }
  }, [business]);

  // 2. Fetch Working Hours
  const fetchWorkingHours = React.useCallback(async () => {
    if (!business?.id) return;
    setLoadingHours(true);
    setErrorMsg(null);
    try {
      const { data: hoursData } = await supabase
        .from("working_hours")
        .select("*")
        .eq("business_id", business.id)
        .is("staff_id", null)
        .order("day_of_week", { ascending: true });

      if (hoursData && hoursData.length > 0) {
        setWorkingHours(hoursData);
      } else {
        const defaultHours: WorkingHour[] = Array.from(
          { length: 7 },
          (_, i) => ({
            day_of_week: i,
            open_time: "09:00:00",
            close_time: "18:00:00",
            is_closed: i === 0,
          }),
        );
        setWorkingHours(defaultHours);
      }
    } catch (err) {
      console.error("Error loading working hours:", err);
      setErrorMsg("Failed to load weekly working hours.");
    } finally {
      setLoadingHours(false);
    }
  }, [business]);

  // 3. Fetch Staff List
  const fetchStaff = React.useCallback(async () => {
    if (!business?.id) return;
    setLoadingStaff(true);
    setErrorMsg(null);
    try {
      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true });

      if (staffData) {
        setStaffList(staffData);
      }
    } catch (err) {
      console.error("Error loading staff catalog:", err);
      setErrorMsg("Failed to load staff roster.");
    } finally {
      setLoadingStaff(false);
    }
  }, [business]);

  // 3b. Fetch staff-specific working hours for all staff of the business
  const fetchStaffHours = React.useCallback(async () => {
    if (!business?.id) return;
    try {
      const { data: staffHoursData } = await supabase
        .from("working_hours")
        .select("*")
        .eq("business_id", business.id)
        .not("staff_id", "is", null)
        .order("day_of_week", { ascending: true });

      if (staffHoursData && staffHoursData.length > 0) {
        // Group by staff_id
        const grouped: Record<string, WorkingHour[]> = {};
        staffHoursData.forEach((h) => {
          if (!h.staff_id) return;
          if (!grouped[h.staff_id]) grouped[h.staff_id] = [];
          grouped[h.staff_id].push(h);
        });
        setStaffHoursMap(grouped);
      }
    } catch (err) {
      console.error("Error loading staff hours:", err);
    }
  }, [business]);

  // 4. Fetch Subscriptions/Plans Catalog
  const fetchPlans = React.useCallback(async () => {
    if (!business?.id) return;
    setLoadingPlans(true);
    setErrorMsg(null);
    try {
      const { data: plansData } = await supabase
        .from("plans")
        .select("*")
        .order("monthly_price", { ascending: true });

      if (plansData) {
        setPlansList(plansData);
      }
    } catch (err) {
      console.error("Error loading plan catalog:", err);
      setErrorMsg("Failed to load subscription plans.");
    } finally {
      setLoadingPlans(false);
    }
  }, [business]);

  // Handle Tab-change trigger loaders
  useEffect(() => {
    if (!business?.id) return;

    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (!active) return;

      if (activeTab === "Business Info") {
        fetchBusinessInfo();
      } else if (activeTab === "Working Hours") {
        fetchWorkingHours();
      } else if (activeTab === "Staff") {
        fetchStaff();
        fetchStaffHours();
      } else if (activeTab === "Billing & Plan") {
        fetchPlans();
      }
    };
    run();

    return () => {
      active = false;
    };
  }, [
    business,
    activeTab,
    fetchBusinessInfo,
    fetchWorkingHours,
    fetchStaff,
    fetchStaffHours,
    fetchPlans,
  ]);

  // Alert flash message helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Save Profile & Settings
  const handleSaveProfile = async () => {
    if (!business?.id) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      // 1. Update business profile
      const { error: bizError } = await supabase
        .from("businesses")
        .update({
          name: bizName,
          category: bizCategory,
          phone: bizPhone || null,
          address: bizAddress || null,
        })
        .eq("id", business.id);

      if (bizError) throw bizError;

      // 2. Check and Update Settings
      const { data: existingSettings } = await supabase
        .from("business_settings")
        .select("id")
        .eq("business_id", business.id)
        .maybeSingle();

      if (existingSettings) {
        const { error: settingsError } = await supabase
          .from("business_settings")
          .update({
            timezone,
            currency,
            booking_page_slug: bookingSlug,
            booking_approval_mode: approvalMode,
            allow_client_cancel: allowCancel,
            cancel_limit_hours: cancelLimit,
            default_payment_method: defaultPaymentMethod,
          })
          .eq("id", existingSettings.id);

        if (settingsError) throw settingsError;
      } else {
        const { error: settingsError } = await supabase
          .from("business_settings")
          .insert([
            {
              business_id: business.id,
              timezone,
              currency,
              booking_page_slug: bookingSlug,
              booking_approval_mode: approvalMode,
              allow_client_cancel: allowCancel,
              cancel_limit_hours: cancelLimit,
              default_payment_method: defaultPaymentMethod,
            },
          ]);

        if (settingsError) throw settingsError;
      }

      await refreshProfile();
      triggerSuccess("Business profile and settings saved successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to save profile settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Save Working Hours
  const handleSaveHours = async () => {
    if (!business?.id) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      interface UpsertWorkingHour {
        id?: string;
        business_id: string;
        day_of_week: number;
        open_time: string;
        close_time: string;
        is_closed: boolean;
      }

      const payload: UpsertWorkingHour[] = workingHours.map((hour) => {
        const item: UpsertWorkingHour = {
          business_id: business.id,
          day_of_week: hour.day_of_week,
          open_time: hour.open_time || "09:00:00",
          close_time: hour.close_time || "18:00:00",
          is_closed: hour.is_closed,
        };
        if (hour.id) {
          item.id = hour.id;
        }
        return item;
      });

      const { error } = await supabase
        .from("working_hours")
        .upsert(payload, { onConflict: "business_id,staff_id,day_of_week" });

      if (error) throw error;

      // Re-fetch to populate IDs
      const { data: updatedHours } = await supabase
        .from("working_hours")
        .select("*")
        .eq("business_id", business.id)
        .is("staff_id", null)
        .order("day_of_week", { ascending: true });

      if (updatedHours) setWorkingHours(updatedHours);
      await fetchStaffHours();

      triggerSuccess("Weekly availability hours updated!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save working hours details.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateHourTime = (
    index: number,
    key: "open_time" | "close_time",
    value: string,
  ) => {
    const updated = [...workingHours];
    updated[index][key] = value;
    setWorkingHours(updated);
  };

  const handleToggleClosed = (index: number) => {
    const updated = [...workingHours];
    updated[index].is_closed = !updated[index].is_closed;
    setWorkingHours(updated);
  };

  // Add Staff Member
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !newStaffName.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    const activeStaffCount = staffList.filter(
      (s) => s.status === "active",
    ).length;
    const maxStaffAllowed = subscription?.plans?.max_staff || 1;

    if (activeStaffCount >= maxStaffAllowed) {
      setErrorMsg(
        `Plan Limit Reached: Your current plan only allows up to ${maxStaffAllowed} active staff member(s). Please upgrade your subscription tier.`,
      );
      setSaving(false);
      return;
    }

    try {
      const { data: newMember, error } = await supabase
        .from("staff")
        .insert([
          {
            business_id: business.id,
            name: newStaffName,
            role: newStaffRole,
            description: newStaffDesc || null,
            email: newStaffEmail.trim() || null,
            system_role: newStaffSystemRole,
            status: "active",
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      if (newMember) {
        setStaffList([...staffList, newMember]);
      }

      setIsAddStaffModalOpen(false);
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffSystemRole("staff");
      setNewStaffDesc("");
      triggerSuccess("Staff member added successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to add staff member.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Toggle Staff Active/Inactive State
  const handleToggleStaffActive = async (id: string, currentStatus: string) => {
    setErrorMsg(null);
    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    if (nextStatus === "active") {
      const activeStaffCount = staffList.filter(
        (s) => s.status === "active",
      ).length;
      const maxStaffAllowed = subscription?.plans?.max_staff || 1;
      if (activeStaffCount >= maxStaffAllowed) {
        setErrorMsg(
          `Plan Limit Reached: Your current plan only allows up to ${maxStaffAllowed} active staff member(s). Please upgrade your subscription tier.`,
        );
        return;
      }
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("staff")
        .update({ status: nextStatus })
        .eq("id", id);

      if (error) throw error;

      setStaffList(
        staffList.map((member) =>
          member.id === id ? { ...member, status: nextStatus } : member,
        ),
      );
      triggerSuccess(`Staff status updated to ${nextStatus}!`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update staff status.");
    } finally {
      setSaving(false);
    }
  };

  // Edit Staff Member Profile
  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editStaffName.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("staff")
        .update({
          name: editStaffName.trim(),
          role: editStaffRole.trim(),
          description: editStaffDesc.trim() || null,
          email: editStaffEmail.trim() || null,
          system_role: editStaffSystemRole,
        })
        .eq("id", editingStaff.id);

      if (error) throw error;

      setStaffList(
        staffList.map((member) =>
          member.id === editingStaff.id
            ? {
                ...member,
                name: editStaffName.trim(),
                role: editStaffRole.trim(),
                description: editStaffDesc.trim() || "",
                email: editStaffEmail.trim() || "",
                system_role: editStaffSystemRole,
              }
            : member,
        ),
      );
      setIsEditStaffModalOpen(false);
      triggerSuccess("Staff member updated successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to update staff member.",
      );
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp connection handshake simulation
  const handleConnectWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppPhone) return;
    setIsConnecting(true);

    setTimeout(() => {
      setWhatsAppConnected(true);
      setIsConnecting(false);
      triggerSuccess("WhatsApp channel successfully connected!");
    }, 1500);
  };

  // Switch Subscribed Plan
  const handleSwitchPlan = async (planId: string, planName: string) => {
    if (!business?.id) return;
    setSwitchingPlanId(planId);
    setErrorMsg(null);

    try {
      // Delete old subscriptions
      await supabase
        .from("subscriptions")
        .delete()
        .eq("business_id", business.id);

      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + 1);

      const isFree = planName.toLowerCase() === "free";

      const { error } = await supabase.from("subscriptions").insert([
        {
          business_id: business.id,
          plan_id: planId,
          status: isFree ? "active" : "trial",
          billing_cycle: isFree ? "forever" : "monthly",
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          trial_ends_at: isFree ? null : endsAt.toISOString(),
        },
      ]);

      if (error) throw error;

      await refreshProfile();
      triggerSuccess(`Your plan was updated to ${planName}!`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update plan subscription.");
    } finally {
      setSwitchingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 text-slate-500 backdrop-blur-[1px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-650 mb-2" />
        <span className="text-sm font-semibold">
          Loading Control Center settings...
        </span>
      </div>
    );
  }

  const activeStaffCount = staffList.filter(
    (s) => s.status === "active",
  ).length;
  const maxStaffAllowed = subscription?.plans?.max_staff || 1;

  return (
    <main className="flex w-full flex-col mt-4 font-sans">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Control Center
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Configure business details, availability slots, staff rosters, and
          messaging integrations.
        </p>
      </div>

      {/* Tabs navigation list - Pill Switched */}
      <div className="mb-6 rounded-2xl bg-slate-200/50 p-1.5 w-fit flex flex-wrap gap-1 border border-slate-200/40 backdrop-blur-sm select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.08)] border border-slate-200/30"
                  : "text-slate-550 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Status messages */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="h-4 w-4 stroke-[3]" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Tab Contents - Glassmorphism layout */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur min-h-[480px]">
        {/* TAB 1: Business Info */}
        {activeTab === "Business Info" && (
          <div>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                  <Building className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Business Profile
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage settings for your shop storefront.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="shrink-0 rounded-xl bg-[#0f294a] text-white px-5 py-2.5 text-sm font-semibold transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 cursor-pointer shadow-lg shadow-[#0f294a]/10 flex items-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Profile & Settings"
                )}
              </button>
            </div>

            <div className="max-w-xl space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Business Name
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableDropdown
                  label="Business Category"
                  options={CATEGORIES}
                  value={bizCategory}
                  onChange={setBizCategory}
                  placeholder="Select Category"
                  searchPlaceholder="Search category..."
                />
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-205"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Booking Page Slug URL
                </label>
                <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden text-sm focus-within:border-slate-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-100 transition duration-200">
                  <span className="px-4 py-2.5 bg-slate-100 border-r border-slate-200 text-slate-450 font-semibold select-none">
                    /book/
                  </span>
                  <input
                    type="text"
                    value={bookingSlug}
                    onChange={(e) =>
                      setBookingSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    className="flex-1 px-4 py-2.5 bg-transparent outline-none text-slate-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Business Address
                </label>
                <input
                  type="text"
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              <hr className="border-slate-100 my-2" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableDropdown
                  label="Timezone"
                  options={TIMEZONES}
                  value={timezone}
                  onChange={setTimezone}
                  placeholder="Select Timezone"
                  searchPlaceholder="Search timezone (e.g. London, New York)..."
                />
                <SearchableDropdown
                  label="Currency Symbol"
                  options={CURRENCIES}
                  value={currency}
                  onChange={setCurrency}
                  placeholder="Select Currency"
                  searchPlaceholder="Search currency (e.g. USD, EUR, INR)..."
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Booking Approval Mode
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Require manual host review before scheduling?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalMode("automatic")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      approvalMode === "automatic"
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-655"
                    }`}
                  >
                    Automatic
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalMode("manual")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      approvalMode === "manual"
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-655"
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Default Payment Method
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the default payment mode for client bookings.
                  </p>
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  {["cash", "card", "online"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDefaultPaymentMethod(mode)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg capitalize transition active:scale-95 cursor-pointer ${
                        defaultPaymentMethod === mode
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: Working Hours */}
        {activeTab === "Working Hours" && (
          <div>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Working Hours
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure your shop weekly availability hours.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveHours}
                disabled={saving}
                className="shrink-0 rounded-xl bg-[#0f294a] text-white px-5 py-2.5 text-sm font-semibold transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 cursor-pointer shadow-lg shadow-[#0f294a]/10 flex items-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Hours"
                )}
              </button>
            </div>

            {loadingHours ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500 mb-2" />
                <span className="text-xs font-semibold">
                  Loading weekly hours...
                </span>
              </div>
            ) : (
              <div className="space-y-3 max-w-xl">
                {workingHours.map((item, idx) => (
                  <div
                    key={item.day_of_week}
                    className={`flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl border transition duration-200 ${
                      item.is_closed
                        ? "bg-slate-50/40 border-slate-100 opacity-60"
                        : "bg-slate-50/60 border-slate-200/80 hover:border-slate-350 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <button
                        onClick={() => handleToggleClosed(idx)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                          !item.is_closed ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            !item.is_closed ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-sm font-semibold text-slate-800 select-none">
                        {DAYS_OF_WEEK[item.day_of_week]}
                      </span>
                    </div>

                    {!item.is_closed ? (
                      <div className="flex items-center gap-2">
                        <CustomTimePicker
                          value={item.open_time || "09:00:00"}
                          onChange={(val) => handleUpdateHourTime(idx, "open_time", val)}
                        />
                        <span className="text-xs text-slate-400 font-medium select-none">
                          to
                        </span>
                        <CustomTimePicker
                          value={item.close_time || "18:00:00"}
                          onChange={(val) => handleUpdateHourTime(idx, "close_time", val)}
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold select-none mr-2">
                        Closed
                      </span>
                    )}
                  </div>
                ))}

              </div>
            )}
          </div>
        )}

        {/* TAB 3: Staff */}
        {activeTab === "Staff" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                  <Users className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Staff Members
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure styling specialists and active status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStaffModalOpen(true)}
                disabled={activeStaffCount >= maxStaffAllowed}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-lg ${
                  activeStaffCount >= maxStaffAllowed
                    ? "bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-[#0f294a] text-white hover:bg-slate-800 shadow-[#0f294a]/10"
                }`}
              >
                <Plus className="size-4" /> Add Staff
              </button>
            </div>

            {loadingStaff ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500 mb-2" />
                <span className="text-xs font-semibold">
                  Loading staff roster...
                </span>
              </div>
            ) : (
              <div className="space-y-3 max-w-4xl">
                {staffList.map((member) => {
                  const isHoursOpen = staffHoursOpen === member.id;
                  // Get or build default hours for this staff member (defaulting to current business hours)
                  const memberHours: WorkingHour[] =
                    staffHoursMap[member.id] &&
                    staffHoursMap[member.id].length === 7
                      ? staffHoursMap[member.id]
                      : Array.from({ length: 7 }, (_, i) => {
                          const existing = (
                            staffHoursMap[member.id] || []
                          ).find((h) => h.day_of_week === i);
                          const bizHour = workingHours.find((bh) => bh.day_of_week === i);
                          return (
                            existing || {
                              day_of_week: i,
                              open_time: bizHour ? bizHour.open_time : "09:00:00",
                              close_time: bizHour ? bizHour.close_time : "18:00:00",
                              is_closed: bizHour ? bizHour.is_closed : i === 0,
                            }
                          );
                        });

                  const updateMemberHour = (
                    dayIdx: number,
                    field: keyof WorkingHour,
                    value: string | boolean,
                  ) => {
                    const bizHour = workingHours.find((bh) => bh.day_of_week === dayIdx);
                    let finalValue = value;

                    if (bizHour) {
                      if (field === "is_closed" && !value) {
                        if (bizHour.is_closed) {
                          alert(`The business is closed on ${DAYS_OF_WEEK[dayIdx]}. You cannot set staff hours for this day.`);
                          return;
                        }
                      }
                      if (field === "open_time" && typeof finalValue === "string") {
                        if (bizHour.open_time && finalValue < bizHour.open_time) {
                          finalValue = bizHour.open_time;
                        }
                      }
                      if (field === "close_time" && typeof finalValue === "string") {
                        if (bizHour.close_time && finalValue > bizHour.close_time) {
                          finalValue = bizHour.close_time;
                        }
                      }
                    }

                    const updated = memberHours.map((h, i) =>
                      i === dayIdx ? { ...h, [field]: finalValue } : h,
                    );
                    setStaffHoursMap((prev) => ({
                      ...prev,
                      [member.id]: updated,
                    }));
                  };

                  const saveStaffHours = async () => {
                    if (!business?.id) return;
                    setSavingStaffHours(true);
                    try {
                      // Delete old staff-specific hours for this staff member
                      await supabase
                        .from("working_hours")
                        .delete()
                        .eq("business_id", business.id)
                        .eq("staff_id", member.id);

                      // Insert fresh rows
                      const rows = memberHours.map((h) => ({
                        business_id: business.id,
                        staff_id: member.id,
                        day_of_week: h.day_of_week,
                        open_time: h.open_time,
                        close_time: h.close_time,
                        is_closed: h.is_closed,
                      }));
                      const { error } = await supabase
                        .from("working_hours")
                        .insert(rows);
                      if (error) throw error;
                      triggerSuccess(`Hours saved for ${member.name}`);
                      setStaffHoursOpen(null);
                    } catch (err) {
                      console.error("Error saving staff hours:", err);
                      setErrorMsg("Failed to save staff hours.");
                    } finally {
                      setSavingStaffHours(false);
                    }
                  };

                  return (
                    <div
                      key={member.id}
                      className={`border border-slate-205 rounded-2xl bg-slate-50/70 transition duration-200 hover:border-slate-350 hover:bg-white hover:shadow-sm ${
                        member.status === "inactive" ? "opacity-60" : ""
                      }`}
                    >
                      {/* Staff card row */}
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold text-xs tracking-wider select-none shadow-[0_4px_12px_rgba(15,23,42,0.15)]">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "ST"}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">
                              {member.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {member.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              setStaffHoursOpen(isHoursOpen ? null : member.id)
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                              isHoursOpen
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {isHoursOpen ? "Close Hours" : "Set Hours"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingStaff(member);
                              setEditStaffName(member.name);
                              setEditStaffRole(member.role || "Senior Stylist");
                              setEditStaffDesc(member.description || "");
                              setEditStaffEmail(member.email || "");
                              setEditStaffSystemRole(
                                member.system_role || "staff",
                              );
                              setIsEditStaffModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleToggleStaffActive(member.id, member.status)
                            }
                            disabled={saving}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-200 border cursor-pointer ${
                              member.status === "active"
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 border-slate-200 text-slate-505 hover:bg-slate-200"
                            }`}
                          >
                            {member.status === "active" ? "Active" : "Inactive"}
                          </button>
                        </div>
                      </div>

                      {/* Expandable per-staff hours editor */}
                      {isHoursOpen && (
                        <div className="border-t border-slate-100 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                            {member.name}&rsquo;s Weekly Availability
                          </p>
                          {memberHours.map((item, dayIdx) => {
                            const bizHour = workingHours.find((bh) => bh.day_of_week === item.day_of_week);
                            const isBizClosed = bizHour ? bizHour.is_closed : false;

                            return (
                              <div
                                key={item.day_of_week}
                                className={`flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl border transition duration-200 ${
                                  isBizClosed
                                    ? "bg-rose-50/20 border-rose-100/60 opacity-60"
                                    : item.is_closed
                                    ? "bg-slate-50/40 border-slate-100 opacity-60"
                                    : "bg-white border-slate-200/80"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-[120px]">
                                  <button
                                    disabled={isBizClosed}
                                    onClick={() =>
                                      updateMemberHour(
                                        dayIdx,
                                        "is_closed",
                                        !item.is_closed,
                                      )
                                    }
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                      isBizClosed
                                        ? "bg-slate-100 cursor-not-allowed"
                                        : !item.is_closed
                                        ? "bg-emerald-500"
                                        : "bg-slate-200"
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                        !item.is_closed && !isBizClosed
                                          ? "translate-x-4"
                                          : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                  <span className="text-xs font-semibold text-slate-700 select-none">
                                    {DAYS_OF_WEEK[item.day_of_week]}
                                  </span>
                                </div>

                                {isBizClosed ? (
                                  <span className="text-xs text-rose-500 font-semibold italic mr-2 select-none">
                                    Store is closed
                                  </span>
                                ) : !item.is_closed ? (
                                  <div className="flex items-center gap-2">
                                    <CustomTimePicker
                                      value={item.open_time}
                                      minTime={bizHour ? bizHour.open_time : undefined}
                                      maxTime={bizHour ? bizHour.close_time : undefined}
                                      onChange={(val) =>
                                        updateMemberHour(dayIdx, "open_time", val)
                                      }
                                    />
                                    <span className="text-xs text-slate-400 font-semibold select-none">
                                      to
                                    </span>
                                    <CustomTimePicker
                                      value={item.close_time}
                                      minTime={bizHour ? bizHour.open_time : undefined}
                                      maxTime={bizHour ? bizHour.close_time : undefined}
                                      onChange={(val) =>
                                        updateMemberHour(dayIdx, "close_time", val)
                                      }
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-semibold italic mr-2 select-none">
                                    Day off
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={saveStaffHours}
                              disabled={savingStaffHours}
                              className="rounded-xl bg-[#0f294a] text-white px-4 py-2 text-xs font-semibold transition hover:bg-slate-800 active:scale-98 cursor-pointer shadow-lg shadow-[#0f294a]/10 flex items-center gap-1.5"
                            >
                              {savingStaffHours ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Save Hours
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WhatsApp Connection */}
        {activeTab === "WhatsApp Connection" && (
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
                  <path d="M12.012 2c-5.506 0-9.98 4.473-9.98 9.98 0 1.76.458 3.473 1.332 4.985l-1.353 4.938 5.062-1.328a9.92 9.92 0 004.938 1.333c5.506 0 9.98-4.473 9.98-9.98A9.99 9.99 0 0012.012 2zm6.056 14.156c-.249.7-1.442 1.282-1.996 1.344-.543.062-1.22.115-3.606-.885-3.056-1.282-4.996-4.385-5.152-4.594-.145-.197-1.198-1.594-1.198-3.047 0-1.453.76-2.167 1.03-2.448.209-.219.542-.323.876-.323.104 0 .208.005.292.01.25.01.422.026.604.432.229.516.786 1.916.854 2.057.068.14.104.307.01.49-.094.192-.14.307-.281.474-.14.166-.296.375-.422.505-.14.14-.287.292-.125.573.161.281.714 1.182 1.531 1.911.828.735 1.526.963 1.745 1.078.219.115.349.094.479-.057.13-.151.563-.656.714-.88.151-.224.302-.187.51-.11.208.078 1.323.625 1.552.74.229.115.38.172.438.271.057.1.057.578-.193 1.282z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  WhatsApp Integration
                </h2>
                <p className="text-xs text-slate-500">
                  Connect your business WhatsApp account to dispatch automation.
                </p>
              </div>
            </div>

            {whatsAppConnected ? (
              <div className="rounded-3xl border border-emerald-200/60 bg-emerald-50/30 p-6 max-w-xl text-slate-700 flex flex-col gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur animate-in fade-in duration-200">
                <div className="flex items-center gap-3 text-emerald-800 font-semibold text-sm">
                  <CheckCircle2 className="size-5 text-emerald-600" /> WhatsApp
                  Connected
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-200/40 pb-2">
                    <span className="font-medium text-slate-500">
                      Connected Phone
                    </span>
                    <span className="font-semibold text-slate-900">
                      {whatsAppPhone}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/40 pb-2">
                    <span className="font-medium text-slate-500">
                      Message Channel
                    </span>
                    <span className="font-semibold text-slate-900">
                      WhatsApp Cloud API
                    </span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="font-medium text-slate-500">
                      API Status
                    </span>
                    <span className="font-semibold text-emerald-600">
                      Active / Operational
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setWhatsAppConnected(false);
                    setWhatsAppPhone("");
                  }}
                  className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  Disconnect Account
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl items-center">
                <div className="flex flex-col items-center justify-center p-6 border border-slate-200/60 bg-slate-50/50 rounded-[24px] text-center transition duration-200 hover:bg-white hover:shadow-sm">
                  <div className="relative p-4 border border-slate-200/80 rounded-2xl bg-white mb-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                    <MockQRCode />
                    {isConnecting && (
                      <div className="absolute inset-0 bg-white/90 rounded-2xl flex flex-col items-center justify-center gap-2 select-none animate-in fade-in duration-100">
                        <RefreshCw className="size-7 text-slate-900 animate-spin" />
                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                          Handshaking...
                        </span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">
                    Scan QR Code
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
                    Open WhatsApp Web on your phone, click Menu &gt; Linked
                    Devices, and scan.
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="flex gap-2.5 items-start mb-4 bg-slate-50 border border-slate-205 p-3.5 rounded-2xl text-xs text-slate-550 leading-relaxed shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                    <AlertCircle className="size-4.5 shrink-0 text-slate-900 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        WhatsApp connection status:
                      </span>{" "}
                      To establish connection without scanning, enter your
                      paired business phone number below to trigger handshake
                      simulation.
                    </div>
                  </div>

                  <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5 select-none">
                        Business Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +1 (555) 987-6543"
                        value={whatsAppPhone}
                        onChange={(e) => setWhatsAppPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isConnecting || !whatsAppPhone}
                      className="w-full rounded-xl bg-[#0f294a] text-white py-2.5 text-sm font-semibold transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#0f294a]/10"
                    >
                      {isConnecting
                        ? "Connecting..."
                        : "Trigger Pair Handshake"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Billing & Plan */}
        {activeTab === "Billing & Plan" && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Plan & Subscription
                </h2>
                <p className="text-xs text-slate-500">
                  Manage your subscription tier, billing, and system limits.
                </p>
              </div>
            </div>

            {loadingPlans ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500 mb-2" />
                <span className="text-xs font-semibold">
                  Loading subscription plans...
                </span>
              </div>
            ) : (
              <>
                <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 max-w-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                    Active Plan
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-2.5">
                    {subscription?.plans?.name || "Free Trial"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {subscription?.plans?.description ||
                      "Get started with fundamental team scheduling tools."}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-semibold text-slate-700 pt-3 border-t border-indigo-100/50">
                    <div>
                      <span className="text-slate-400 block font-normal">
                        Active Since
                      </span>
                      {subscription?.starts_at
                        ? new Date(subscription.starts_at).toLocaleDateString()
                        : "Today"}
                    </div>
                    <div>
                      <span className="text-slate-400 block font-normal">
                        Billing Cycle
                      </span>
                      {subscription?.billing_cycle === "forever"
                        ? "Forever"
                        : "Monthly"}
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-955 uppercase tracking-wider mb-4">
                  Switch Subscriptions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl">
                  {plansList.map((plan) => {
                    const isActivePlan = subscription?.plan_id === plan.id;
                    const isUpdating = switchingPlanId === plan.id;
                    return (
                      <div
                        key={plan.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between ${
                          isActivePlan
                            ? "bg-slate-50 border-slate-350"
                            : "bg-white border-slate-205"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900">
                              {plan.name}
                            </h4>
                            <span className="text-lg font-extrabold text-slate-950">
                              ${plan.monthly_price}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {plan.description}
                          </p>
                        </div>

                        <div className="mt-5">
                          {isActivePlan ? (
                            <div className="w-full text-center py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />{" "}
                              Current Tier
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                handleSwitchPlan(plan.id, plan.name)
                              }
                              disabled={switchingPlanId !== null}
                              className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Select Plan"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Staff Modal Overlay */}
      {isAddStaffModalOpen && (
        <div
          onClick={() => setIsAddStaffModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <button
              onClick={() => setIsAddStaffModalOpen(false)}
              className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-405 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Add New Staff
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Create a schedule profile for styling specialists.
            </p>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Walker"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1.5 select-none">
                  Role / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Stylist, Specialist, Admin"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Email Address (optional)
                </label>
                <input
                  type="email"
                  placeholder="staff@example.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              {(profile?.role === "owner" || profile?.role === "admin") && (
                <div className="mb-2">
                  <SearchableDropdown
                    label="System Access Role"
                    options={SYSTEM_ROLES}
                    value={newStaffSystemRole}
                    onChange={(val) =>
                      setNewStaffSystemRole(val as "owner" | "admin" | "staff")
                    }
                    placeholder="Select System Role"
                    searchPlaceholder="Search role..."
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Short Description
                </label>
                <textarea
                  placeholder="Expert stylist with 5+ years experience..."
                  value={newStaffDesc}
                  onChange={(e) => setNewStaffDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 rounded-xl bg-[#0f294a] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 cursor-pointer shadow-lg shadow-slate-900/10 flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Profile"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit Staff Modal Overlay */}
      {isEditStaffModalOpen && editingStaff && (
        <div
          onClick={() => setIsEditStaffModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <button
              onClick={() => setIsEditStaffModalOpen(false)}
              className="absolute right-4 top-4 size-8 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Edit Staff Member
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Modify the profile details and role of the specialist.
            </p>

            <form onSubmit={handleEditStaff} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                  Role / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Stylist, Specialist, Admin"
                  value={editStaffRole}
                  onChange={(e) => setEditStaffRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Email Address (optional)
                </label>
                <input
                  type="email"
                  placeholder="staff@example.com"
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>

              {(profile?.role === "owner" || profile?.role === "admin") && (
                <div className="mb-2">
                  <SearchableDropdown
                    label="System Access Role"
                    options={SYSTEM_ROLES}
                    value={editStaffSystemRole}
                    onChange={(val) =>
                      setEditStaffSystemRole(val as "owner" | "admin" | "staff")
                    }
                    placeholder="Select System Role"
                    searchPlaceholder="Search role..."
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 select-none">
                  Short Description
                </label>
                <textarea
                  placeholder="Expert specialist description..."
                  value={editStaffDesc}
                  onChange={(e) => setEditStaffDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 rounded-xl bg-[#0f294a] py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 hover:scale-[1.02] active:scale-98 cursor-pointer shadow-lg shadow-slate-900/10 flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
