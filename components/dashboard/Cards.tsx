import { TrendingDown, TrendingUp } from "lucide-react";
import { CardProps } from "./Hero";

const Cards = ({
  period,
  title,
  type,
  value,
  statistics,
  nature,
}: CardProps & { statistics: string; nature: "increase" | "decrease" | "neutral" }) => {
  return (
    <div className="flex h-full w-full flex-col justify-between gap-4 rounded-[22px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            nature === "increase"
              ? "bg-emerald-500"
              : nature === "decrease"
                ? "bg-rose-500"
                : "bg-slate-300"
          }`}
        />
      </div>

      {type === "number" ? (
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
      ) : type === "currency" ? (
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          ${value.toFixed(2)}
        </p>
      ) : (
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          {value}%
        </p>
      )}

      <div className="flex items-center text-sm font-medium text-slate-500">
        <span
          className={`mr-1.5 flex items-center gap-1 font-bold ${
            nature === "increase"
              ? "text-emerald-600"
              : nature === "decrease"
                ? "text-rose-600"
                : "text-slate-450 bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px]"
          }`}
        >
          {nature === "increase" && <TrendingUp className="size-4" />}
          {nature === "decrease" && <TrendingDown className="size-4" />}
          {statistics}
        </span>

        {period === "today"
          ? "vs yesterday"
          : period === "week"
            ? "vs last week"
            : "vs last month"}
      </div>
    </div>
  );
};

export default Cards;
