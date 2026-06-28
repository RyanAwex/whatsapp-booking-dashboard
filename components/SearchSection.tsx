import { Bell, Search, Target, ChevronLeft, Menu } from "lucide-react";

interface SearchSectionProps {
  isSidebarOpen: boolean;
  onToggle: () => void;
}

const SearchSection = ({ isSidebarOpen, onToggle }: SearchSectionProps) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex items-stretch min-h-[73px]">
        <div
          className={`flex items-center transition-all duration-300 ease-in-out shrink-0 py-4 px-3 ${
            isSidebarOpen
              ? "md:w-60 w-auto justify-between"
              : "md:w-16 w-auto justify-center"
          }`}
        >
          {/* Mobile: Hamburger Menu Button */}
          <button
            type="button"
            onClick={onToggle}
            className="md:hidden flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Menu className="size-5" />
          </button>

          {/* Desktop/Tablet Logo & Toggle Button */}
          <div className="hidden md:flex items-center justify-between w-full">
            {isSidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                    <Target className="size-4" />
                  </div>
                  <span className="text-base font-bold text-slate-900 select-none">Bookly</span>
                </div>
                <button
                  type="button"
                  onClick={onToggle}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-655 transition hover:bg-slate-55 hover:text-slate-800 shadow-sm"
                  aria-label="Collapse Sidebar"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onToggle}
                className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-white shadow-md hover:scale-105 hover:bg-slate-800 transition cursor-pointer"
                title="Expand Sidebar"
              >
                <Target className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Section (Search + Notification) */}
        <div className="flex flex-1 items-center justify-between gap-4 px-4 sm:px-6 py-4">
          {/* Search Input */}
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 shadow-sm">
            <Search className="size-4 shrink-0 text-slate-400" />
            <input
              placeholder="Search clients, appointments, invoices..."
              className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100">
              <Bell className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SearchSection;
