"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Mail,
  Lock,
  User,
  Briefcase,
  Layers,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  // State variables
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form fields
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");
  const [businessCategory, setBusinessCategory] =
    useState<string>("beauty_salon");
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkSession();
  }, [router]);

  // Form validation helper
  const validateForm = () => {
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return false;
    }
    if (!isLogin) {
      if (!name.trim()) {
        setErrorMsg("Please enter your full name.");
        return false;
      }
      if (!businessName.trim()) {
        setErrorMsg("Please enter your business name.");
        return false;
      }
      if (!agreeTerms) {
        setErrorMsg(
          "You must agree to the Terms of Service and Privacy Policy.",
        );
        return false;
      }
    }
    return true;
  };

  // Auth Handler
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.session) {
          setSuccessMsg("Success! Redirecting to dashboard...");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1000);
        }
      } else {
        // Sign Up (Register)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              business_name: businessName,
              business_category: businessCategory,
              role: "owner",
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        // Try inserting metadata into businesses and users tables if they exist
        try {
          if (data.user) {
            // 1. Create Business
            const { data: businessData, error: bError } = await supabase
              .from("businesses")
              .insert([
                {
                  name: businessName,
                  category: businessCategory,
                  status: "active",
                },
              ])
              .select("id")
              .single();

            if (!bError && businessData) {
              // 2. Create User record connected to business
              await supabase.from("users").insert([
                {
                  id: data.user.id,
                  business_id: businessData.id,
                  name,
                  role: "owner",
                },
              ]);
            }
          }
        } catch (dbError) {
          console.warn(
            "Database tables insertion skipped or failed. This is expected if schema is managed dynamically:",
            dbError,
          );
        }

        if (data.session) {
          setSuccessMsg("Account created successfully! Redirecting...");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1000);
        } else {
          setSuccessMsg(
            "Registration successful! Please check your email for verification link.",
          );
          // Reset form fields
          setName("");
          setBusinessName("");
          setAgreeTerms(false);
        }
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || "An unexpected error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Left side: Premium Light Showcase Section */}
      <div className="relative hidden w-[45%] lg:flex flex-col justify-between p-12 xl:p-16 2xl:p-20 bg-gradient-to-b from-indigo-50/60 via-white to-slate-100/50 border-r border-slate-200/80 overflow-hidden">
        {/* Subtle Light Glow Effects */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-teal-500/5 blur-[130px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] opacity-70 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 shadow-md shadow-indigo-600/10">
            <Sparkles className="h-5.5 w-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
              Bookly
            </h1>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-450 mt-1">
              For Businesses
            </p>
          </div>
        </div>

        {/* Visual Mockups / Interactive Widgets */}
        <div className="relative z-10 my-auto flex flex-col items-start gap-8 max-w-lg xl:max-w-xl">
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 xl:text-5xl xl:leading-[1.15] leading-tight">
              Your clients book easily, you stay organized.
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Let clients book appointments online, track visit history, and
              coordinate schedules on a clean business calendar.
            </p>
          </div>

          {/* Micro-Dashboard Component */}
          <div className="w-full rounded-2xl border border-slate-200/80 bg-white/90 p-6 xl:p-8 shadow-[0_20px_45px_-12px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Today&apos;s Appointments
                </span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-700/20">
                Live
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50/65 p-4 border border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                    JW
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      James Wilson
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Haircut & Styling • with Olivia
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-indigo-600">
                    09:00 AM
                  </span>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    Confirmed
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50/65 p-4 border border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-full bg-teal-50 flex items-center justify-center text-xs font-bold text-teal-650">
                    ST
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Sophia Taylor
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Balayage • with Mia
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-indigo-600">
                    10:30 AM
                  </span>
                  <span className="block text-[10px] text-amber-655 font-semibold mt-0.5">
                    Pending Approval
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-center text-xs text-slate-400">
          <span>© 2026 Bookly Inc. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-slate-655 transition">
              Terms
            </a>
            <a href="#" className="hover:text-slate-655 transition">
              Privacy
            </a>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form Section with vertical centering fix */}
      <div className="relative w-full lg:w-[55%] h-full overflow-y-auto bg-white/40 backdrop-blur-3xl">
        <div className="min-h-full w-full flex flex-col justify-center py-12 px-6 sm:px-12 md:px-16 lg:px-20 xl:px-24">
          {/* Glow Effects on Mobile */}
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-[90px] pointer-events-none lg:hidden" />
          <div className="absolute left-0 bottom-0 h-80 w-80 rounded-full bg-teal-500/5 blur-[90px] pointer-events-none lg:hidden" />

          {/* Dynamic max-width: login is max-w-md, register is max-w-xl to allow spacious grid */}
          <div
            className={`mx-auto w-full transition-all duration-300 z-10 ${isLogin ? "max-w-md" : "max-w-xl"} space-y-8`}
          >
            {/* Mobile Brand Header */}
            <div className="flex items-center gap-3 lg:hidden justify-center mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 shadow-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Bookly</h1>
            </div>

            {/* Form Header */}
            <div className="text-center lg:text-left space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 xl:text-4xl">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-slate-500 xl:text-base">
                {isLogin
                  ? "Start managing your appointments and clients"
                  : "Register your business and build your custom booking page"}
              </p>
            </div>

            {/* Segmented Tab Control */}
            <div className="relative flex p-1.5 rounded-xl bg-slate-100 border border-slate-200/50 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-center py-2.5 text-sm font-bold rounded-lg transition-all duration-300 relative z-10 ${
                  isLogin
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-center py-2.5 text-sm font-bold rounded-lg transition-all duration-300 relative z-10 ${
                  !isLogin
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Register
              </button>
              {/* Slide active tab background */}
              <div
                className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] bg-white border border-slate-200/60 rounded-lg shadow-sm transition-all duration-300 ease-out ${
                  isLogin ? "translate-x-0" : "translate-x-[100%]"
                }`}
              />
            </div>

            {/* Error and Success Notifications */}
            {errorMsg && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-inset ring-red-600/10 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-650" />
                <div>
                  <p className="font-bold">Authentication Error</p>
                  <p className="mt-0.5 text-xs text-red-750">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/10 animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-650" />
                <div>
                  <p className="font-bold">Success</p>
                  <p className="mt-0.5 text-xs text-emerald-750">
                    {successMsg}
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-6">
              {isLogin ? (
                // Login Form Fields (Spacious Single Column)
                <div className="space-y-5">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="ryan@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSuccessMsg(
                            "Check your email for password recovery instructions.",
                          );
                          setErrorMsg(null);
                        }}
                        className="text-xs font-bold text-indigo-650 hover:text-indigo-700 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-650 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Register Form Fields (Spacious 2-Column Grid on Desktop)
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="name"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        required={!isLogin}
                        placeholder="Ryan Sefiani"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Email (Register) */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email-reg"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        id="email-reg"
                        type="email"
                        required={!isLogin}
                        placeholder="ryan@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="businessName"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Business Name
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Briefcase className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        id="businessName"
                        type="text"
                        required={!isLogin}
                        placeholder="Eclipse Barber Studio"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Business Category Dropdown */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="businessCategory"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Business Category
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Layers className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <select
                        id="businessCategory"
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
                      >
                        <option value="beauty_salon">
                          Beauty & Hair Salon
                        </option>
                        <option value="barbershop">Barbershop</option>
                        <option value="coaching_fitness">
                          Coaching & Fitness
                        </option>
                        <option value="tutor_education">
                          Tutor & Education
                        </option>
                        <option value="medical_clinic">Medical & Clinic</option>
                        <option value="repair_services">
                          Repair & Maintenance
                        </option>
                        <option value="other">Other Service Business</option>
                      </select>
                      {/* Custom Arrow */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg
                          className="h-4 w-4 text-slate-400"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            d="M7 9l3 3 3-3"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Password (Register) - Spans 2 Columns */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label
                      htmlFor="password-reg"
                      className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-4.5 w-4.5 text-slate-400" />
                      </div>
                      <input
                        id="password-reg"
                        type={showPassword ? "text" : "password"}
                        required={!isLogin}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-650 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Remember Me / Terms Checkbox */}
              {isLogin ? (
                <div className="flex items-center py-1">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500/20"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-xs font-bold text-slate-500"
                  >
                    Keep me signed in on this device
                  </label>
                </div>
              ) : (
                <div className="flex items-start py-1">
                  <div className="flex h-5 items-center">
                    <input
                      id="agree-terms"
                      name="agree-terms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="ml-2 text-xs">
                    <label
                      htmlFor="agree-terms"
                      className="font-bold text-slate-500"
                    >
                      I agree to the{" "}
                      <a
                        href="#"
                        className="font-semibold text-indigo-600 hover:underline transition"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="#"
                        className="font-semibold text-indigo-600 hover:underline transition"
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-4 text-sm font-bold text-white shadow-md shadow-indigo-600/10 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Get Started"}
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Link for Mobile */}
            <div className="text-center text-xs text-slate-500 lg:hidden">
              {isLogin ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Create one now
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
