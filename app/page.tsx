"use client";

import React from "react";
import Appointments from "@/components/dashboard/Appointments";
import StaffAvailability from "@/components/dashboard/StaffAvailability";
import Hero from "@/components/dashboard/Hero";
import RecentActivity from "@/components/dashboard/RecentActivity";
import RevenueOverview from "@/components/dashboard/RevenueOverview";

const DashboardPage = () => {
  return (
    <main className="flex w-full flex-col mt-4">
      <Hero />
      <section className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
        <Appointments />
        <RevenueOverview />
        <RecentActivity />
        <StaffAvailability />
      </section>
    </main>
  );
};

export default DashboardPage;
