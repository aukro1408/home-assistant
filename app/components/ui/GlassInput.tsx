"use client";

import React from "react";

export function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  type = "number",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="mt-2 relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-white/[0.14] transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06] focus:scale-[1.01]"
        />
        {suffix ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}
