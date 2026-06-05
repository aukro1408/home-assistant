"use client";

import { useTheme } from "../contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`fixed top-4 right-4 z-50 w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 ${
        theme === "dark"
          ? "bg-yellow-500/20 border border-yellow-400/30 text-yellow-400 shadow-yellow-500/25"
          : "bg-blue-500/20 border border-blue-400/30 text-blue-400 shadow-blue-500/25"
      } border shadow-lg backdrop-blur-sm flex items-center justify-center`}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <span className="text-xl">☀️</span>
      ) : (
        <span className="text-xl">🌙</span>
      )}
    </button>
  );
}
