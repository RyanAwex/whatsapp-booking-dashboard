"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Loader2, Sparkles } from "lucide-react";

export interface UserProfile {
  id: string;
  business_id: string | null;
  role: "owner" | "admin" | "staff";
  name: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionProfile {
  id: string;
  business_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  starts_at: string;
  ends_at: string;
  trial_ends_at: string | null;
  plans?: {
    id: string;
    name: string;
    description: string;
    monthly_price: number;
    max_staff: number;
    max_services: number;
    max_clients: number;
    max_appointments: number;
  };
}

export interface BusinessSettings {
  id: string;
  business_id: string;
  currency: string;
  timezone: string;
  booking_page_slug: string;
  booking_approval_mode: "automatic" | "manual";
  allow_client_cancel: boolean;
  cancel_limit_hours: number;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  business: BusinessProfile | null;
  subscription: SubscriptionProfile | null;
  settings: BusinessSettings | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  business: null,
  subscription: null,
  settings: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionProfile | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfileAndBusiness = async (userId: string) => {
    try {
      // 1. Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile(profileData);

        if (profileData.business_id) {
          // 2. Fetch business profile
          const { data: businessData, error: businessError } = await supabase
            .from("businesses")
            .select("*")
            .eq("id", profileData.business_id)
            .maybeSingle();

          if (businessError) throw businessError;
          setBusiness(businessData);

          // 3. Fetch active subscription
          const { data: subData, error: subError } = await supabase
            .from("subscriptions")
            .select("*, plans(*)")
            .eq("business_id", profileData.business_id)
            .maybeSingle();

          if (subError) throw subError;
          setSubscription(subData);

          // 4. Fetch business settings
          const { data: settingsData, error: settingsError } = await supabase
            .from("business_settings")
            .select("*")
            .eq("business_id", profileData.business_id)
            .maybeSingle();

          if (settingsError) throw settingsError;
          setSettings(settingsData);
        } else {
          setBusiness(null);
          setSubscription(null);
          setSettings(null);
        }
      } else {
        setProfile(null);
        setBusiness(null);
        setSubscription(null);
        setSettings(null);
      }
    } catch (err) {
      console.error("Error fetching user profile/business info:", err);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfileAndBusiness(session.user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await fetchProfileAndBusiness(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setBusiness(null);
        setSubscription(null);
        setSettings(null);
      }
      
      if (mounted) setLoading(false);
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            setUser(session.user);
            await fetchProfileAndBusiness(session.user.id);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setBusiness(null);
          setSubscription(null);
          setSettings(null);
          router.push("/auth");
        }
      }
    );

    return () => {
      mounted = false;
      authListener.unsubscribe();
    };
  }, [router]);

  // Handle client-side routing protection
  useEffect(() => {
    if (loading) return;

    const isPublicRoute = pathname?.startsWith("/auth") || pathname?.startsWith("/book");
    const isOnboardingRoute = pathname === "/onboarding";

    if (!user) {
      // Redirect unauthenticated users to auth
      if (!isPublicRoute) {
        router.push("/auth");
      }
    } else {
      // Authenticated users
      const hasBusiness = !!business;
      const hasSubscription = !!subscription;
      const needsOnboarding = !hasBusiness || !hasSubscription;

      if (needsOnboarding) {
        if (!isOnboardingRoute && !isPublicRoute) {
          router.push("/onboarding");
        }
      } else {
        // Fully onboarded users shouldn't see auth or onboarding
        if (isPublicRoute || isOnboardingRoute) {
          if (pathname?.startsWith("/auth") || isOnboardingRoute) {
            router.push("/");
          }
        }
      }
    }
  }, [user, profile, business, subscription, loading, pathname, router]);

  // Automatically sync past-ended appointments to completed status in the background
  useEffect(() => {
    if (!business?.id) return;

    const runSync = async () => {
      try {
        await supabase.rpc("sync_ended_appointments", { p_business_id: business.id });
      } catch (err) {
        console.error("Auto sync error:", err);
      }
    };

    runSync();
    // Run every 30 seconds to keep past appointments updated in real-time
    const interval = setInterval(runSync, 30000);
    return () => clearInterval(interval);
  }, [business?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // Render a premium brand loading screen
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 font-sans">
        <div className="relative flex flex-col items-center">
          {/* Brand Logo Animation */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 shadow-xl shadow-indigo-600/20 mb-6 animate-pulse">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Bookly</h2>
          <p className="text-xs text-slate-450 font-semibold uppercase tracking-widest mt-1">
            Loading workspace
          </p>
          <div className="flex items-center gap-1.5 mt-8 text-indigo-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-semibold text-slate-500">Connecting securely...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        business,
        subscription,
        settings,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

