"use client";

import React from "react";
import { Card } from "./Card";
import { MONTH_NAMES_RU } from "../../../lib/utils";

export function MonthYearPicker({
  month,
  year,
  years,
  onChangeMonth,
  onChangeYear,
  title,
  accentClass = "text-blue-400",
}: {
  title: string;
  month: number; // 1..12
  year: number;
  years: number[];
  onChangeMonth: (m: number) => void;
  onChangeYear: (y: number) => void;
  accentClass?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">{title}</p>
          <div className="mt-1">
            <span className={`text-sm font-semibold ${accentClass}`}>
              {MONTH_NAMES_RU[month - 1]} {year}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => onChangeMonth(Number(e.target.value))}
            className="bg-white/[0.06] border border-white/[0.09] rounded-xl px-3 py-2 text-white outline-none focus:border-white/[0.18] transition-all duration-200 hover:bg-white/[0.09]"
            aria-label="Месяц"
          >
            {MONTH_NAMES_RU.map((name, idx) => (
              <option key={name} value={idx + 1} className="bg-[#0b0f19]">
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onChangeYear(Number(e.target.value))}
            className="bg-white/[0.06] border border-white/[0.09] rounded-xl px-3 py-2 text-white outline-none focus:border-white/[0.18] transition-all duration-200 hover:bg-white/[0.09]"
            aria-label="Год"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#0b0f19]">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}
