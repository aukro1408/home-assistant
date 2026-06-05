"use client";

import React from "react";

export function Card({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "yellow" | "blue" | "green" | "purple";
}) {
  const glowClass = glow ? `glow-${glow}` : "shadow-xl";
  return (
    <div className={`glass rounded-[20px] p-5 ${glowClass} ${className} transition-all duration-300 hover:scale-[1.01]`}>
      {children}
    </div>
  );
}
