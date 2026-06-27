"use client";

import React, { useState } from "react";
import {
  Clock,
  Sparkles,
  Star,
  Gift,
  CheckCircle2,
  ChevronDown,
  Save,
} from "lucide-react";

// Toggle component
const Toggle = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
        enabled ? "bg-emerald-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};

export default function AutomationPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Workflow 1: Reminder Messages
  const [remindersActive, setRemindersActive] = useState(true);
  const [reminderTiming, setReminderTiming] = useState("24 hours before");
  const [reminderTemplate, setReminderTemplate] = useState(
    "Hi [Customer Name], this is Bookly Salon. Just a reminder that you have an appointment with [Stylist Name] on [Date] at [Time]. See you then! 💇‍♂️"
  );

  // Workflow 2: Follow-up Messages
  const [followupsActive, setFollowupsActive] = useState(true);
  const [followupDelay, setFollowupDelay] = useState("3 days after");
  const [followupTemplate, setFollowupTemplate] = useState(
    "Hi [Customer Name]! It's been a few days since your last haircut at Bookly Salon. We want to make sure you're still loving your style! Reply here if you need any adjustments. ✨"
  );

  // Workflow 3: Review Requests
  const [reviewsActive, setReviewsActive] = useState(true);
  const [reviewsDelay, setReviewsDelay] = useState("2 hours after");
  const [reviewsLink, setReviewsLink] = useState("https://g.page/booklysalon/review");
  const [reviewsTemplate, setReviewsTemplate] = useState(
    "Hey [Customer Name], thanks for booking with us today! We'd love to hear how Olivia did. If you have 1 minute, please leave us a review here: [Review Link]. Thank you! ⭐"
  );

  // Workflow 4: No-Show Recovery
  const [recoveryActive, setRecoveryActive] = useState(true);
  const [recoveryDelay, setRecoveryDelay] = useState("1 day after");
  const [recoveryDiscount, setRecoveryDiscount] = useState("RECOVER10");
  const [recoveryTemplate, setRecoveryTemplate] = useState(
    "Hi [Customer Name], we missed you at your appointment yesterday! We know life gets busy. Use code [Discount Code] to get 10% off your next booking: bookly.com/book"
  );

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  return (
    <main className="flex w-full flex-col mt-4">
      {/* Title */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Automation
          </h1>
          <p className="text-base text-slate-500 mt-1.5">
            Configure automated WhatsApp notification templates and trigger workflows.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 w-fit rounded-xl bg-[#0f294a] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-[#0f294a]/10 transition hover:bg-slate-800 hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <Save className="size-5" /> Save Workflows
        </button>
      </div>

      {/* Success alert banner */}
      {saveSuccess && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200/60 p-4.5 text-emerald-850 flex items-center gap-2.5 text-base font-semibold shadow-[0_4px_15px_rgba(16,185,129,0.05)] animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="size-5.5 text-emerald-600" />
          <span>All automation workflows and templates have been saved successfully!</span>
        </div>
      )}

      {/* Workflows Grid List */}
      <form onSubmit={handleSaveAll} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-12">
        
        {/* WORKFLOW 1: Reminder Messages */}
        <div className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur transition duration-205 hover:border-slate-350">
          <div className="flex items-start justify-between gap-4 mb-5 select-none">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                <Clock className="size-5.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Reminder Messages</h3>
                <p className="text-sm text-slate-500 mt-0.5">Send a booking reminder to customers.</p>
              </div>
            </div>
            <Toggle enabled={remindersActive} onChange={() => setRemindersActive(!remindersActive)} />
          </div>

          <div className={`space-y-4 transition-all duration-200 ${!remindersActive ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <div>
              <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block mb-1.5 select-none">
                Trigger Timing
              </label>
              <div className="relative max-w-xs">
                <select
                  value={reminderTiming}
                  onChange={(e) => setReminderTiming(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-750 outline-none hover:bg-slate-100 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 cursor-pointer"
                >
                  <option value="12 hours before">12 hours before appointment</option>
                  <option value="24 hours before">24 hours before appointment</option>
                  <option value="48 hours before">48 hours before appointment</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                WhatsApp Template Text
              </label>
              <textarea
                value={reminderTemplate}
                onChange={(e) => setReminderTemplate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium text-slate-755 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 resize-none h-32 leading-relaxed scrollbar"
              />
              <div className="text-xs text-slate-400 font-medium mt-2 flex flex-wrap gap-1.5 items-center select-none">
                <span>Supported tags:</span>
                {["[Customer Name]", "[Stylist Name]", "[Date]", "[Time]"].map(tag => (
                  <code key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200/50">
                    {tag}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WORKFLOW 2: Follow-up Messages */}
        <div className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur transition duration-205 hover:border-slate-350">
          <div className="flex items-start justify-between gap-4 mb-5 select-none">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                <Sparkles className="size-5.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Follow-up Messages</h3>
                <p className="text-sm text-slate-500 mt-0.5">Send returning follow-ups to loyal clients.</p>
              </div>
            </div>
            <Toggle enabled={followupsActive} onChange={() => setFollowupsActive(!followupsActive)} />
          </div>

          <div className={`space-y-4 transition-all duration-200 ${!followupsActive ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <div>
              <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block mb-1.5 select-none">
                Trigger Timing
              </label>
              <div className="relative max-w-xs">
                <select
                  value={followupDelay}
                  onChange={(e) => setFollowupDelay(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-750 outline-none hover:bg-slate-100 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 cursor-pointer"
                >
                  <option value="3 days after">3 days after visit</option>
                  <option value="1 week after">1 week after visit</option>
                  <option value="2 weeks after">2 weeks after visit</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                WhatsApp Template Text
              </label>
              <textarea
                value={followupTemplate}
                onChange={(e) => setFollowupTemplate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium text-slate-755 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 resize-none h-32 leading-relaxed scrollbar"
              />
              <div className="text-xs text-slate-400 font-medium mt-2 flex flex-wrap gap-1.5 items-center select-none">
                <span>Supported tags:</span>
                {["[Customer Name]"].map(tag => (
                  <code key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200/50">
                    {tag}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WORKFLOW 3: Review Requests */}
        <div className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur transition duration-205 hover:border-slate-350">
          <div className="flex items-start justify-between gap-4 mb-5 select-none">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                <Star className="size-5.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Review Requests</h3>
                <p className="text-sm text-slate-500 mt-0.5">Collect Google reviews after completed bookings.</p>
              </div>
            </div>
            <Toggle enabled={reviewsActive} onChange={() => setReviewsActive(!reviewsActive)} />
          </div>

          <div className={`space-y-4 transition-all duration-200 ${!reviewsActive ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                  Trigger Delay
                </label>
                <div className="relative">
                  <select
                    value={reviewsDelay}
                    onChange={(e) => setReviewsDelay(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-750 outline-none hover:bg-slate-100 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 cursor-pointer"
                  >
                    <option value="1 hour after">1 hour after visit</option>
                    <option value="2 hours after">2 hours after visit</option>
                    <option value="24 hours after">24 hours after visit</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                  Review Link URL
                </label>
                <input
                  type="url"
                  value={reviewsLink}
                  onChange={(e) => setReviewsLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-750 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                WhatsApp Template Text
              </label>
              <textarea
                value={reviewsTemplate}
                onChange={(e) => setReviewsTemplate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium text-slate-755 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 resize-none h-32 leading-relaxed scrollbar"
              />
              <div className="text-xs text-slate-400 font-medium mt-2 flex flex-wrap gap-1.5 items-center select-none">
                <span>Supported tags:</span>
                {["[Customer Name]", "[Review Link]"].map(tag => (
                  <code key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200/50">
                    {tag}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WORKFLOW 4: No-Show Recovery */}
        <div className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur transition duration-205 hover:border-slate-350">
          <div className="flex items-start justify-between gap-4 mb-5 select-none">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                <Gift className="size-5.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">No-Show Recovery</h3>
                <p className="text-sm text-slate-500 mt-0.5">Recover no-shows with promotional offers.</p>
              </div>
            </div>
            <Toggle enabled={recoveryActive} onChange={() => setRecoveryActive(!recoveryActive)} />
          </div>

          <div className={`space-y-4 transition-all duration-200 ${!recoveryActive ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wider block mb-1.5 select-none">
                  Trigger Timing
                </label>
                <div className="relative">
                  <select
                    value={recoveryDelay}
                    onChange={(e) => setRecoveryDelay(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-10 py-3 text-sm font-semibold text-slate-750 outline-none hover:bg-slate-100 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 cursor-pointer"
                  >
                    <option value="1 day after">1 day after no-show</option>
                    <option value="2 days after">2 days after no-show</option>
                    <option value="3 days after">3 days after no-show</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                  Discount Code Coupon
                </label>
                <input
                  type="text"
                  value={recoveryDiscount}
                  onChange={(e) => setRecoveryDiscount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-750 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block mb-1.5 select-none">
                WhatsApp Template Text
              </label>
              <textarea
                value={recoveryTemplate}
                onChange={(e) => setRecoveryTemplate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium text-slate-755 outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 transition duration-200 resize-none h-32 leading-relaxed scrollbar"
              />
              <div className="text-xs text-slate-400 font-medium mt-2 flex flex-wrap gap-1.5 items-center select-none">
                <span>Supported tags:</span>
                {["[Customer Name]", "[Discount Code]"].map(tag => (
                  <code key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200/50">
                    {tag}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>

      </form>
    </main>
  );
}
