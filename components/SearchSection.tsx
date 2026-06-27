import { Bell, Bolt, Search } from "lucide-react";

const SearchSection = ({ isSidebarOpen }: { isSidebarOpen: boolean }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 shadow-sm">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            placeholder="Search clients, appointments, invoices..."
            className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100">
            <Bell className="size-4" />
          </button>
          <button className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100">
            <Bolt className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default SearchSection;
