"use client";

import React, { useEffect, useState } from "react";

export function ProgressBar({ value, color }: { value: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="h-2 rounded-full bg-white/[0.05] mt-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
