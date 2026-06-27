import { createClient } from "@supabase/supabase-js";
import BookingWizardClient from "@/app/book/[slug]/BookingWizardClient";
import { Sparkles, Calendar } from "lucide-react";

// Server component to fetch the business information and details
export default async function BookingSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Initialize server-side Supabase client using public keys (respects RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Look up business settings by slug
  const { data: settings, error: settingsError } = await supabase
    .from("business_settings")
    .select("*")
    .eq("booking_page_slug", slug)
    .maybeSingle();

  if (settingsError || !settings) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 text-slate-800 font-sans p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-150 mb-5 shadow-sm text-indigo-650">
          <Calendar className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Booking Page Not Found</h1>
        <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
          The booking link you followed seems to be invalid or the business has not completed their setup yet.
        </p>
      </div>
    );
  }

  // 2. Fetch business details
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", settings.business_id)
    .single();

  // 3. Fetch active services
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", settings.business_id)
    .eq("status", "active")
    .order("name", { ascending: true });

  // 4. Fetch active staff
  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("business_id", settings.business_id)
    .eq("status", "active")
    .order("name", { ascending: true });

  // 5. Fetch business-level working hours (staff_id is null)
  const { data: workingHours } = await supabase
    .from("working_hours")
    .select("*")
    .eq("business_id", settings.business_id)
    .is("staff_id", null)
    .order("day_of_week", { ascending: true });

  // 6. Fetch ALL staff-specific working hours for this business
  const { data: staffWorkingHours } = await supabase
    .from("working_hours")
    .select("*")
    .eq("business_id", settings.business_id)
    .not("staff_id", "is", null)
    .order("day_of_week", { ascending: true });

  // 7. Fetch existing appointments for the next 30 days (to check slot conflicts)
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  const { data: existingAppointments } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, staff_id")
    .eq("business_id", settings.business_id)
    .in("status", ["confirmed", "pending"])
    .gte("start_time", now.toISOString())
    .lte("start_time", thirtyDaysLater.toISOString());

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.05),transparent_40%),linear-gradient(135deg,#f8fafc_0%,#f1f5f9_100%)] flex flex-col justify-center items-center py-10 px-4 font-sans">
      <div className="w-full max-w-2xl bg-white/95 rounded-[32px] border border-slate-200/80 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.08)] p-6 md:p-8 backdrop-blur relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 shadow-md shadow-indigo-650/15">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
              {business?.name || "Bookly Booking Store"}
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
              {business?.category?.replace("_", " ") || "Styling Specialist"}
            </p>
          </div>
        </div>

        {/* Interactive Booking Wizard Form */}
        <BookingWizardClient
          business={business}
          settings={settings}
          services={services || []}
          staff={staff || []}
          workingHours={workingHours || []}
          staffWorkingHours={staffWorkingHours || []}
          existingAppointments={existingAppointments || []}
        />
      </div>
    </div>
  );
}
