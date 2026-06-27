"use client";

import {
  BadgeDollarSign,
  Blocks,
  Calendar,
  ChevronDown,
  ChevronLeft,
  House,
  MapPin,
  MessageCircle,
  Bolt,
  Target,
  Workflow,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: House, title: "Home", href: "/" },
  { icon: Calendar, title: "Calendar", href: "/calendar" },
  { icon: MessageCircle, title: "Clients", href: "/clients" },
  { icon: BadgeDollarSign, title: "Sales", href: "/sales" },
  { icon: Blocks, title: "Services", href: "/services" },
  { icon: Workflow, title: "Flow Builder", href: "/flow-builder" },
  { icon: Zap, title: "Automation", href: "/automation" },
  { icon: Bolt, title: "Control Center", href: "/control-center" },
];

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const centerWhenClosed = !isOpen ? "justify-center" : "";

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-50 flex h-screen flex-col gap-4 border-r border-slate-200/80 bg-white/95 px-3 py-4 shadow-[10px_0_30px_-18px_rgba(15,23,42,0.22)] backdrop-blur transition-all duration-300 ease-in-out ${
        isOpen ? "w-60" : "w-16"
      }`}
    >
      <div className={`flex min-h-14 w-full items-center ${centerWhenClosed}`}>
        {!isOpen ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:scale-105 hover:bg-slate-100"
          >
            <Target className="size-5" />
          </button>
        ) : (
          <>
            <div className="flex flex-1 items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                <Target className="size-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Bookly</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronLeft className="size-5" />
            </button>
          </>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {navItems.map(({ icon: Icon, title, href }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={title}
              href={href}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition-all duration-200 ${
                !isOpen ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="size-5 shrink-0" />

              {isOpen && (
                <span className="text-sm font-medium transition-opacity duration-300">
                  {title}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/help-center"
        className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 ${centerWhenClosed}`}
      >
        <MapPin className="size-5 shrink-0" />
        {isOpen && <span className="text-sm font-medium">Help Center</span>}
      </Link>

      <div
        className={`flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 py-2 transition-all duration-200 ${
          isOpen ? "px-2" : "justify-center px-1"
        }`}
      >
        <Image
          src="/me.jpg"
          alt="user profile pic"
          width={40}
          height={40}
          className="rounded-full object-cover"
          priority
        />

        {isOpen && (
          <>
            <div className="flex flex-1 flex-col">
              <p className="text-sm font-semibold text-slate-900">
                Ryan Sefiani
              </p>
              <p className="text-xs font-medium text-slate-500">Owner</p>
            </div>

            <button className="flex size-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-white">
              <ChevronDown className="size-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
