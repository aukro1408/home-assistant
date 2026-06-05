"use client";

import React from "react";

export function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1.5 shadow-sm">
      <span className={`text-xs font-medium ${color}`}>{label}</span>
      <span className="text-xs text-zinc-400">{value}</span>
    </div>
  );
}
