"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import SearchSection from "@/components/SearchSection";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (isSidebarOpen && mobile) {
        document.body.classList.add("overflow-hidden");
      } else {
        document.body.classList.remove("overflow-hidden");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("resize", handleResize);
    };
  }, [isSidebarOpen]);

  const isBookRoute = pathname?.startsWith("/book");
  const isAuthRoute = pathname?.startsWith("/auth");
  const isOnboardingRoute = pathname?.startsWith("/onboarding");

  if (isBookRoute) {
    return (
      <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.1),transparent_35%),linear-gradient(135deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900 flex justify-center items-center py-6 px-4">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    );
  }

  if (isAuthRoute || isOnboardingRoute) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-slate-900">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.14),transparent_35%),linear-gradient(135deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900 flex flex-col">
      <SearchSection
        isSidebarOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((value) => !value)}
      />

      <div className="flex flex-1 relative">
        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in cursor-pointer"
          />
        )}

        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((value) => !value)}
          topOffset={73}
        />

        <div
          style={{ paddingLeft: isMobile ? "0px" : (isSidebarOpen ? "240px" : "64px") }}
          className="flex-grow flex flex-col transition-all duration-300 ease-in-out"
        >
          <div className="flex-1 px-4 pb-8 pt-2 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
