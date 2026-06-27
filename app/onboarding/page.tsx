"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/Providers";
import {
  Briefcase,
  MapPin,
  Phone,
  Settings,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Calendar,
  Globe,
  DollarSign,
  ShieldCheck,
  Clock,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  max_staff: number;
  max_services: number;
  max_clients: number;
  max_appointments: number;
  has_whatsapp: boolean;
  has_analytics: boolean;
  has_flow_builder: boolean;
  has_automations: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, business, refreshProfile } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Business Profile
  const [bizName, setBizName] = useState<string>("");
  const [bizCategory, setBizCategory] = useState<string>("beauty_salon");
  const [bizPhone, setBizPhone] = useState<string>("");
  const [bizAddress, setBizAddress] = useState<string>("");
  const [avgCustomers, setAvgCustomers] = useState<number>(10);
  const [expectedRevenue, setExpectedRevenue] = useState<number>(3000);

  // Step 2: Settings
  const [timezone, setTimezone] = useState<string>("UTC");
  const [currency, setCurrency] = useState<string>("USD");
  const [bookingSlug, setBookingSlug] = useState<string>("");
  const [slugChecking, setSlugChecking] = useState<boolean>(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [approvalMode, setApprovalMode] = useState<string>("automatic");
  const [allowCancel, setAllowCancel] = useState<boolean>(true);
  const [cancelLimit, setCancelLimit] = useState<number>(24);

  // Step 3: Plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Pre-fill business name from signup metadata if available
  useEffect(() => {
    if (business) {
      setBizName(business.name || "");
      setBizCategory(business.category || "beauty_salon");
    } else if (user?.user_metadata) {
      setBizName(user.user_metadata.business_name || "");
      setBizCategory(user.user_metadata.business_category || "beauty_salon");
    }
  }, [user, business]);

  // Generate a default slug based on business name
  useEffect(() => {
    if (bizName && !bookingSlug) {
      const generated = bizName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setBookingSlug(generated);
    }
  }, [bizName, bookingSlug]);

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .order("monthly_price", { ascending: true });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setPlans(data as Plan[]);
          setSelectedPlanId(data[0].id);
        } else {
          // Fallback plans if database seeds are missing
          const fallbackPlans: Plan[] = [
            {
              id: "fallback-free",
              name: "Free",
              description: "Essential tools for single practitioners starting out.",
              monthly_price: 0.00,
              max_staff: 1,
              max_services: 5,
              max_clients: 50,
              max_appointments: 50,
              has_whatsapp: false,
              has_analytics: false,
              has_flow_builder: false,
              has_automations: false
            },
            {
              id: "fallback-starter",
              name: "Starter",
              description: "Grow your business with more capacity and CRM tools.",
              monthly_price: 15.00,
              max_staff: 3,
              max_services: 15,
              max_clients: 200,
              max_appointments: 200,
              has_whatsapp: false,
              has_analytics: false,
              has_flow_builder: false,
              has_automations: false
            },
            {
              id: "fallback-pro",
              name: "Pro",
              description: "Unlock full scheduling automation, WhatsApp tools, and analytics.",
              monthly_price: 35.00,
              max_staff: 999,
              max_services: 999,
              max_clients: 9999,
              max_appointments: 9999,
              has_whatsapp: true,
              has_analytics: true,
              has_flow_builder: true,
              has_automations: true
            }
          ];
          setPlans(fallbackPlans);
          setSelectedPlanId(fallbackPlans[0].id);
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  // Check slug availability
  useEffect(() => {
    if (!bookingSlug) {
      setSlugAvailable(null);
      return;
    }

    const checkSlug = async () => {
      setSlugChecking(true);
      try {
        const { data, error } = await supabase
          .from("business_settings")
          .select("booking_page_slug")
          .eq("booking_page_slug", bookingSlug)
          .maybeSingle();

        if (error) throw error;
        setSlugAvailable(!data);
      } catch (err) {
        console.error("Error checking slug:", err);
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      checkSlug();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [bookingSlug]);

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!bizName.trim()) {
        setErrorMsg("Please enter a business name.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!bookingSlug.trim()) {
        setErrorMsg("Please enter a booking page slug.");
        return;
      }
      if (slugAvailable === false) {
        setErrorMsg("This slug is already taken. Please choose another one.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((prev) => prev - 1);
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Check user context
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      
      if (!currentUserId) {
        throw new Error("No active user session found.");
      }

      // 2. Fetch or create business record
      let businessId = business?.id;

      if (!businessId) {
        // Double-check if the profile trigger already created a business
        const { data: profileData } = await supabase
          .from("users")
          .select("business_id")
          .eq("id", currentUserId)
          .maybeSingle();

        businessId = profileData?.business_id;
      }

      if (businessId) {
        // Update existing business record
        const { error: bizUpdateError } = await supabase
          .from("businesses")
          .update({
            name: bizName,
            category: bizCategory,
            phone: bizPhone || null,
            address: bizAddress || null,
            average_customers: avgCustomers,
            expected_revenue: expectedRevenue,
          })
          .eq("id", businessId);

        if (bizUpdateError) throw bizUpdateError;
      } else {
        // Create new business record
        const { data: newBiz, error: bizCreateError } = await supabase
          .from("businesses")
          .insert([
            {
              name: bizName,
              category: bizCategory,
              phone: bizPhone || null,
              address: bizAddress || null,
              average_customers: avgCustomers,
              expected_revenue: expectedRevenue,
              status: "active",
            },
          ])
          .select("id")
          .single();

        if (bizCreateError) throw bizCreateError;
        businessId = newBiz.id;

        // Update user profile link
        const { error: profileUpdateError } = await supabase
          .from("users")
          .update({ business_id: businessId })
          .eq("id", currentUserId);

        if (profileUpdateError) throw profileUpdateError;
      }

      // 3. Create or update Business Settings
      const { data: existingSettings } = await supabase
        .from("business_settings")
        .select("id")
        .eq("business_id", businessId)
        .maybeSingle();

      if (existingSettings) {
        const { error: settingsUpdateError } = await supabase
          .from("business_settings")
          .update({
            currency,
            timezone,
            booking_page_slug: bookingSlug,
            booking_approval_mode: approvalMode,
            allow_client_cancel: allowCancel,
            cancel_limit_hours: cancelLimit,
          })
          .eq("id", existingSettings.id);

        if (settingsUpdateError) throw settingsUpdateError;
      } else {
        const { error: settingsCreateError } = await supabase
          .from("business_settings")
          .insert([
            {
              business_id: businessId,
              currency,
              timezone,
              booking_page_slug: bookingSlug,
              booking_approval_mode: approvalMode,
              allow_client_cancel: allowCancel,
              cancel_limit_hours: cancelLimit,
            },
          ]);

        if (settingsCreateError) throw settingsCreateError;
      }

      // 4. Create Subscription
      // Delete any existing trial subscriptions first to prevent duplicate active status
      await supabase
        .from("subscriptions")
        .delete()
        .eq("business_id", businessId);

      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + 1); // 1 month plan

      const planName = plans.find(p => p.id === selectedPlanId)?.name || "Free";
      const isFree = planName.toLowerCase() === "free";

      const { error: subError } = await supabase
        .from("subscriptions")
        .insert([
          {
            business_id: businessId,
            plan_id: selectedPlanId.startsWith("fallback") ? null : selectedPlanId, // Handle fallback mode cleanly
            status: isFree ? "active" : "trial",
            billing_cycle: "monthly",
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            trial_ends_at: isFree ? null : endsAt.toISOString(),
          },
        ]);

      if (subError) throw subError;

      // 5. Create default Staff member for Owner
      const { data: existingStaff } = await supabase
        .from("staff")
        .select("id")
        .eq("business_id", businessId)
        .limit(1);

      if (!existingStaff || existingStaff.length === 0) {
        const ownerName = user?.user_metadata?.name || "Owner";
        await supabase
          .from("staff")
          .insert([
            {
              business_id: businessId,
              name: ownerName,
              role: "Owner",
              description: "Business owner & lead specialist",
              status: "active",
            },
          ]);
      }

      // 6. Refresh profile and redirect
      await refreshProfile();
      router.push("/");
      router.refresh();

    } catch (err: any) {
      console.error("Error setting up onboarding details:", err);
      setErrorMsg(err.message || "Something went wrong during setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex items-center justify-center py-10 px-4 font-sans">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/80 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 shadow-md shadow-indigo-600/10">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-655">
              Welcome to Bookly
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {step === 1 && "Tell us about your business"}
            {step === 2 && "Customize your scheduler"}
            {step === 3 && "Select your plan"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 1 && "Let's gather some basic info to tailor your dashboard."}
            {step === 2 && "Setup how clients will view and interact with your page."}
            {step === 3 && "Choose a package to match your current team scope."}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Business Name
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    placeholder="e.g. Blade & Shave Studio"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Business Category
                </label>
                <select
                  value={bizCategory}
                  onChange={(e) => setBizCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                >
                  <option value="beauty_salon">Beauty Salon</option>
                  <option value="barbershop">Barbershop</option>
                  <option value="medical_clinic">Medical & Dental Clinic</option>
                  <option value="tutoring">Tutoring & Education</option>
                  <option value="fitness_coaching">Fitness & Sports Coach</option>
                  <option value="repair_services">Repair & Maintenance</option>
                  <option value="photography">Photography & Art</option>
                  <option value="other">Other Service Business</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Phone (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={bizPhone}
                      onChange={(e) => setBizPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Address (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={bizAddress}
                      onChange={(e) => setBizAddress(e.target.value)}
                      placeholder="123 Main St, New York"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Avg. Daily Customers
                  </label>
                  <input
                    type="number"
                    value={avgCustomers}
                    onChange={(e) => setAvgCustomers(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Expected Monthly Revenue ($)
                  </label>
                  <input
                    type="number"
                    value={expectedRevenue}
                    onChange={(e) => setExpectedRevenue(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Timezone
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Globe className="h-4 w-4" />
                    </span>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white appearance-none"
                    >
                      <option value="UTC">UTC</option>
                      <option value="US/Eastern">US/Eastern (EST)</option>
                      <option value="US/Central">US/Central (CST)</option>
                      <option value="US/Pacific">US/Pacific (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Europe/Paris">Europe/Paris (CET)</option>
                      <option value="Asia/Dubai">Asia/Dubai</option>
                      <option value="Asia/Singapore">Asia/Singapore</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Currency
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <DollarSign className="h-4 w-4" />
                    </span>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-800 text-sm outline-none transition focus:border-indigo-500 focus:bg-white appearance-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="AED">AED (Dh)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Custom Booking URL Slug
                </label>
                <p className="text-[11px] text-slate-450 mb-2">
                  This will be the address where your clients go to book online.
                </p>
                <div className="flex rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden text-sm transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500/20">
                  <span className="px-4 py-3 bg-slate-100/85 border-r border-slate-200/80 text-slate-500 font-medium select-none">
                    bookly.com/book/
                  </span>
                  <input
                    type="text"
                    value={bookingSlug}
                    onChange={(e) =>
                      setBookingSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="your-business"
                    className="flex-1 px-4 py-3 bg-transparent outline-none text-slate-800 text-sm font-semibold"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  {slugChecking ? (
                    <span className="text-slate-450 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                    </span>
                  ) : slugAvailable === true ? (
                    <span className="text-emerald-605 font-bold flex items-center gap-0.5">
                      ✓ Slug is available
                    </span>
                  ) : slugAvailable === false ? (
                    <span className="text-rose-600 font-bold">
                      ✗ Slug is taken
                    </span>
                  ) : (
                    <span className="text-slate-400">Letters, numbers, and hyphens only</span>
                  )}
                </div>
              </div>

              <hr className="border-slate-100 my-2" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Booking Approval</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Should bookings go directly to the schedule or require your approval?
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setApprovalMode("automatic")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        approvalMode === "automatic"
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalMode("manual")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        approvalMode === "manual"
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Allow Cancellations</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Can clients cancel their booking online?
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowCancel}
                    onChange={(e) => setAllowCancel(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                </div>

                {allowCancel && (
                  <div className="flex items-center justify-between pl-4 border-l-2 border-slate-100 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <Clock className="h-3.5 w-3.5" /> Cancel Limit (Hours before start)
                    </div>
                    <input
                      type="number"
                      value={cancelLimit}
                      onChange={(e) => setCancelLimit(parseInt(e.target.value) || 0)}
                      min={1}
                      className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-right text-xs font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              {loadingPlans ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                  <span className="text-sm font-semibold">Loading available packages...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const price = plan.monthly_price;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`group relative flex flex-col p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10 scale-[1.01]"
                            : "bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-bold text-base tracking-tight">
                              {plan.name}
                            </h3>
                            <p
                              className={`text-xs mt-0.5 max-w-[80%] leading-relaxed ${
                                isSelected ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {plan.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold tracking-tight">
                              ${price.toFixed(0)}
                            </span>
                            <span
                              className={`text-[10px] block font-medium ${
                                isSelected ? "text-slate-400" : "text-slate-400"
                              }`}
                            >
                              / month
                            </span>
                          </div>
                        </div>

                        <hr
                          className={`my-3 border-dashed ${
                            isSelected ? "border-slate-800" : "border-slate-100"
                          }`}
                        />

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Check
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? "text-indigo-400" : "text-indigo-650"
                              }`}
                            />
                            <span>
                              Up to {plan.max_staff === 999 ? "Unlimited" : plan.max_staff} Staff
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? "text-indigo-400" : "text-indigo-650"
                              }`}
                            />
                            <span>
                              Up to {plan.max_services === 999 ? "Unlimited" : plan.max_services} Services
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? "text-indigo-400" : "text-indigo-650"
                              }`}
                            />
                            <span>
                              {plan.max_appointments === 9999 ? "Unlimited" : `${plan.max_appointments}/mo`} Bookings
                            </span>
                          </div>
                          {plan.has_whatsapp && (
                            <div className="flex items-center gap-1.5">
                              <Check
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isSelected ? "text-indigo-400" : "text-indigo-650"
                                }`}
                              />
                              <span>WhatsApp Notifications</span>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="absolute right-4 bottom-4 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-sm animate-scale">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-md shadow-slate-950/10 hover:bg-slate-800 transition"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteSetup}
              disabled={loading || loadingPlans || !selectedPlanId}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-sm font-bold text-white shadow-lg shadow-indigo-600/15 hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Finalizing...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
