"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFirestore } from "../lib/firestore";
import { WeatherWidget } from "./Weather";
import { CurrencyWidget } from "./CurrencyWidget";
import { AIChatWidget } from "./AIChatWidget";

type Tab = "home" | "electricity" | "water" | "planner" | "settings";

type UsageEntry = { usage: number; cost: number; meterReading?: number };
type DraftEntry = { usageStr: string; costStr: string; meterReadingStr: string };

type TaskStatus = "planned" | "in_progress" | "completed";
type PlannerTask = { id: string; title: string; status: TaskStatus };

const tabs: { id: Tab; label: string; emoji: string; color: string }[] = [
  { id: "home",        label: "Главная",  emoji: "🏠", color: "text-blue-400" },
  { id: "electricity", label: "Свет",     emoji: "⚡", color: "text-yellow-400" },
  { id: "water",       label: "Вода",     emoji: "💧", color: "text-blue-400" },
  { id: "planner",     label: "Планер",   emoji: "📅", color: "text-green-400" },
  { id: "settings",    label: "Настройки",emoji: "⚙️", color: "text-violet-400" },
];

const MONTH_NAMES_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const WEEKDAY_SHORT_RU_MONDAY_FIRST = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymKey(year: number, month: number) {
  return `${year}-${pad2(month)}`; // month: 1..12
}

function getLatestAvailableMonth(
  data: Record<string, UsageEntry>,
  currentYear: number,
  currentMonth: number
) {
  const currentKey = ymKey(currentYear, currentMonth);
  if (data[currentKey]) {
    return { entry: data[currentKey], year: currentYear, month: currentMonth };
  }

  const availableKeys = Object.keys(data)
    .filter((key) => /^\d{4}-\d{2}$/.test(key))
    .sort((a, b) => b.localeCompare(a));

  if (availableKeys.length === 0) {
    return { entry: null, year: currentYear, month: currentMonth };
  }

  const [latestKey] = availableKeys;
  const [yearStr, monthStr] = latestKey.split("-");

  return {
    entry: data[latestKey],
    year: Number(yearStr),
    month: Number(monthStr),
  };
}

function ymdKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`; // month/day: 1..*
}

function daysInMonth(year: number, month: number) {
  // month: 1..12
  return new Date(year, month, 0).getDate();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ─── Reusable card ───────────────────────────────────────── */
export function Card({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "yellow" | "blue" | "green" | "purple";
}) {
  const glowClass = glow ? `glow-${glow}` : "shadow-[0_8px_32px_rgba(0,0,0,0.4)]";
  return (
    <div className={`glass rounded-3xl p-5 ${glowClass} ${className}`}>
      {children}
    </div>
  );
}

/* ─── Stat pill ───────────────────────────────────────────── */
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-3 py-2">
      <span className={`text-xs font-medium ${color}`}>{label}</span>
      <span className="text-xs text-zinc-400">{value}</span>
    </div>
  );
}

/* ─── Progress ────────────────────────────────────────────── */
function ProgressBar({ value, color }: { value: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="progress-bar mt-3">
      <div
        className={`progress-fill ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MonthYearPicker({
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
            className="bg-white/[0.04] border border-white/[0.07] rounded-2xl px-3 py-2 text-white outline-none focus:border-white/[0.14]"
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
            className="bg-white/[0.04] border border-white/[0.07] rounded-2xl px-3 py-2 text-white outline-none focus:border-white/[0.14]"
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

function GlassInput({
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
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:border-white/[0.14]"
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

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold border transition-all duration-200 ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-white/[0.03] border-white/[0.08]"
          : `bg-white/[0.06] border-white/[0.12] hover:bg-white/[0.09] hover:border-white/[0.18] ${className}`
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { cls: string; label: string }> = {
    planned: { cls: "bg-white/[0.04] border-white/[0.10] text-zinc-300", label: "Планируется" },
    in_progress: { cls: "bg-yellow-500/15 border-yellow-400/20 text-yellow-400", label: "В процессе" },
    completed: { cls: "bg-green-500/15 border-green-400/20 text-green-400", label: "Выполнено" },
  };
  const item = map[status];
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-xl border flex-shrink-0 ${item.cls}`}>
      {item.label}
    </span>
  );
}

function PinModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (pin === "7777") {
      onSuccess();
      setPin("");
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  const handleChange = (value: string) => {
    setPin(value);
    setError(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-3xl p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-2xl mx-auto mb-3">
            🔐
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Введите PIN-код</h3>
          <p className="text-sm text-zinc-400">Для редактирования данных</p>
        </div>

        <input
          type="password"
          value={pin}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="••••"
          maxLength={4}
          className={`w-full bg-white/[0.06] border rounded-2xl px-4 py-3 text-center text-white text-2xl tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-blue-400/50 transition mb-4 ${
            error ? "border-red-400/50" : "border-white/[0.12]"
          }`}
          autoFocus
        />

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">Неверный PIN-код</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.09] transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!pin}
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold bg-blue-500/20 border border-blue-400/30 text-blue-400 hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarMonth({
  year,
  month,
  selectedDay,
  onSelectDay,
  tasksByDate,
}: {
  year: number;
  month: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  tasksByDate: Record<string, PlannerTask[]>;
}) {
  const total = daysInMonth(year, month);
  const firstJs = new Date(year, month - 1, 1).getDay(); // 0..6
  const firstMonday = (firstJs + 6) % 7; // 0..6 where 0=Mon

  const cells = 42;
  const items: Array<number | null> = [];
  for (let i = 0; i < cells; i++) {
    const dayNum = i - firstMonday + 1;
    if (dayNum < 1 || dayNum > total) items.push(null);
    else items.push(dayNum);
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAY_SHORT_RU_MONDAY_FIRST.map((d) => (
          <div key={d} className="text-center text-[11px] text-zinc-500">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {items.map((dayNum, idx) => {
          if (!dayNum) return <div key={idx} className="h-10" />;

          const key = ymdKey(year, month, dayNum);
          const count = tasksByDate[key]?.length ?? 0;
          const isSelected = dayNum === selectedDay;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(dayNum)}
              className={`h-10 rounded-2xl border text-center text-sm transition-all duration-200 ${
                isSelected
                  ? "bg-white/[0.08] border-white/[0.16] shadow-[0_0_0_1px_rgba(255,255,255,0.08)] scale-105"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:scale-105"
              }`}
            >
              <div className="h-full flex flex-col items-center justify-center gap-0.5">
                <span className={`leading-none ${isSelected ? "text-white" : "text-zinc-300"}`}>{dayNum}</span>
                {count > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-green-400/85 animate-pulse-slow"
                    style={{ opacity: isSelected ? 1 : 0.85 }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}


/* ─── Home tab ────────────────────────────────────────────── */
function HomeTab({
  onNavigate,
  electricityData,
  waterData,
  electricityMonth,
  electricityYear,
  waterMonth,
  waterYear,
  notificationsEnabled,
  plannerTasks,
}: {
  onNavigate: (t: Tab) => void;
  electricityData: Record<string, UsageEntry>;
  waterData: Record<string, UsageEntry>;
  electricityMonth: number;
  electricityYear: number;
  waterMonth: number;
  waterYear: number;
  notificationsEnabled: boolean;
  plannerTasks: Record<string, PlannerTask[]>;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 5 ? "Доброй ночи" :
    hour < 12 ? "Доброе утро" :
    hour < 18 ? "Добрый день" : "Добрый вечер";

  // Get current month data or fallback to latest available month
  const elecResult = getLatestAvailableMonth(electricityData, electricityYear, electricityMonth);
  const waterResult = getLatestAvailableMonth(waterData, waterYear, waterMonth);

  const elecUsage = elecResult.entry ? `${elecResult.entry.usage} kWh` : "—";
  const waterUsage = waterResult.entry ? `${waterResult.entry.usage} м³` : "—";
  const elecCost = elecResult.entry ? `${elecResult.entry.cost} ₴` : "Нет данных";
  const waterCost = waterResult.entry ? `${waterResult.entry.cost} ₴` : "Нет данных";

  const elecMonthLabel = `${MONTH_NAMES_RU[elecResult.month - 1]} ${elecResult.year}`;
  const waterMonthLabel = `${MONTH_NAMES_RU[waterResult.month - 1]} ${waterResult.year}`;

  // Check if reminder should show (notifications enabled and 1st day of month)
  const showReminder = notificationsEnabled && now.getDate() === 1;

  // Find nearest upcoming day with tasks
  const findNearestTasks = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Check today and next 30 days
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(currentYear, currentMonth - 1, currentDay + i);
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth() + 1;
      const day = checkDate.getDate();
      const key = ymdKey(year, month, day);

      if (plannerTasks[key] && plannerTasks[key].length > 0) {
        return {
          date: checkDate,
          tasks: plannerTasks[key]
        };
      }
    }

    return null; // No tasks found in next 30 days
  };

  const nearestEvent = findNearestTasks();

  return (
    <div className="space-y-5 stagger animate-slide-up">

      {/* Header */}
      <div className="pt-2 pb-1">
        <p className="text-sm text-zinc-500 font-medium tracking-wide uppercase mb-1">
          {greeting} 👋
        </p>
        <div className="flex items-center gap-3">
          <img
            src="/paciuk.png"
            alt="Paciuk cat"
            className="h-12 w-auto rounded-lg animate-bounce-subtle"
          />
          <h1 className="text-[2.2rem] font-bold leading-tight tracking-tight">
            Paciuk<span className="text-blue-400 animate-gradient-shift bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Home</span>
          </h1>
        </div>
        <p className="text-zinc-400 text-sm mt-1">
          Все под контролем — {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Weather Widget */}
      <WeatherWidget />

      {/* Currency Widget */}
      <CurrencyWidget />

      {/* Reminder banner */}
      {showReminder && (
        <Card glow="yellow" className="relative overflow-hidden animate-slide-up">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-yellow-400/10 blur-2xl pointer-events-none animate-float" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center text-2xl animate-scale-pulse">
              🔔
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Пора снять показания счетчиков</p>
              <p className="text-xs text-zinc-400 mt-1">Электричество и вода</p>
            </div>
          </div>
        </Card>
      )}

      {/* Hero card */}
      <Card glow="blue" className="relative overflow-hidden animate-slide-up">
        {/* decorative orb */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none animate-float" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Состояние дома</p>
              <p className="text-2xl font-bold text-white">Всё в порядке</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center text-xl animate-scale-pulse">
              🏡
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <StatPill label="⚡ Свет" value={elecUsage} color="text-yellow-400" />
            <StatPill label="💧 Вода" value={waterUsage} color="text-blue-400" />
            <StatPill label="📅 Задач" value="2" color="text-green-400" />
          </div>
        </div>
      </Card>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3">

        <button
          onClick={() => onNavigate("electricity")}
          className="glass rounded-3xl p-5 glow-yellow text-left w-full relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-yellow-400/10 blur-2xl pointer-events-none animate-float" />
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400/15 border border-yellow-400/20 flex items-center justify-center text-lg mb-3 animate-bounce-subtle">
              ⚡
            </div>
            <p className="text-xs text-zinc-500 mb-1">Электричество</p>
            <p className="text-2xl font-bold text-yellow-400">{elecCost}</p>
            <p className="text-[11px] text-zinc-600 mt-1">{elecMonthLabel}</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate("water")}
          className="glass rounded-3xl p-5 glow-blue text-left w-full relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-blue-400/10 blur-2xl pointer-events-none animate-float" style={{ animationDelay: "0.5s" }} />
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-blue-400/15 border border-blue-400/20 flex items-center justify-center text-lg mb-3 animate-bounce-subtle" style={{ animationDelay: "0.3s" }}>
              💧
            </div>
            <p className="text-xs text-zinc-500 mb-1">Водоснабжение</p>
            <p className="text-2xl font-bold text-blue-400">{waterCost}</p>
            <p className="text-[11px] text-zinc-600 mt-1">{waterMonthLabel}</p>
          </div>
        </button>

      </div>

      {/* Upcoming task */}
      <Card className="animate-slide-up transition-all duration-300 hover:scale-[1.01]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-green-400/15 border border-green-400/20 flex items-center justify-center text-sm animate-bounce-subtle">
            📅
          </div>
          <p className="text-sm font-semibold text-zinc-300">Ближайшее событие</p>
        </div>
        {nearestEvent ? (
          <div>
            {nearestEvent.tasks.map((task, idx) => (
              <div key={task.id} className="flex items-center justify-between mb-2 last:mb-0">
                <div>
                  <p className="font-semibold text-white">{task.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {nearestEvent.date.getDate()} {MONTH_NAMES_RU[nearestEvent.date.getMonth()]}
                    {idx === 0 && nearestEvent.tasks.length > 1 && ` (+${nearestEvent.tasks.length - 1})`}
                  </p>
                </div>
                {idx === 0 && <span className="text-xl animate-pulse-slow">⏳</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Нет ближайших событий</p>
              <p className="text-xs text-zinc-500 mt-0.5">Добавьте задачи в планировщик</p>
            </div>
            <span className="text-xl animate-float">📋</span>
          </div>
        )}
      </Card>

    </div>
  );
}

function UtilityUsageTab({
  kind,
  title,
  icon,
  accent,
  month,
  year,
  years,
  onChangeMonth,
  onChangeYear,
  draft,
  setDraft,
  savedEntry,
  onSave,
  unitLabel,
  targetUsage,
  progressGradientClass,
  pricePerUnit,
}: {
  kind: "electricity" | "water";
  title: string;
  icon: string;
  accent: "yellow" | "blue";
  month: number; // 1..12
  year: number;
  years: number[];
  onChangeMonth: (m: number) => void;
  onChangeYear: (y: number) => void;
  draft: DraftEntry;
  setDraft: (next: DraftEntry) => void;
  savedEntry?: UsageEntry;
  onSave: () => void;
  unitLabel: string;
  targetUsage: number;
  progressGradientClass: string;
  pricePerUnit: string;
}) {
  const [savePulse, setSavePulse] = useState<null | "ok" | "err">(null);

  const usageNum = Number(draft?.usageStr ?? "");
  const costNum = Number(draft?.costStr ?? "");
  const pricePerUnitNum = Number(pricePerUnit);

  // Auto-calculate cost when usage changes
  useEffect(() => {
    if (draft?.usageStr && Number.isFinite(usageNum) && Number.isFinite(pricePerUnitNum)) {
      const calculatedCost = usageNum * pricePerUnitNum;
      setDraft({ ...draft, costStr: calculatedCost.toFixed(2) });
    }
  }, [draft?.usageStr, pricePerUnit]);

  const isValid = (draft?.usageStr?.trim().length ?? 0) > 0 && (draft?.costStr?.trim().length ?? 0) > 0 && Number.isFinite(usageNum) && Number.isFinite(costNum);

  const savedUsage = savedEntry?.usage ?? null;
  const percent = savedUsage === null ? 0 : Math.round((savedUsage / targetUsage) * 100);

  const accentGlow = accent === "yellow" ? "yellow" : "blue";
  const accentText = accent === "yellow" ? "text-yellow-400" : "text-blue-400";

  const onSaveClick = () => {
    if (!isValid) {
      setSavePulse("err");
      setTimeout(() => setSavePulse(null), 1200);
      return;
    }
    onSave();
    setSavePulse("ok");
    setTimeout(() => setSavePulse(null), 1200);
  };

  return (
    <div className="space-y-5 stagger animate-slide-up">
      <div className="pt-2 pb-1">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Мониторинг</p>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      </div>

      <MonthYearPicker
        title="Месяц и год"
        month={month}
        year={year}
        years={years}
        onChangeMonth={onChangeMonth}
        onChangeYear={onChangeYear}
        accentClass={accentText}
      />

      <Card glow={accentGlow} className="relative overflow-hidden">
        <div
          className={`absolute -top-10 -right-10 w-36 h-36 rounded-full ${
            accent === "yellow" ? "bg-yellow-400/10" : "bg-blue-400/10"
          } blur-3xl pointer-events-none animate-float`}
        />
        <div className="relative">
          <div
            className={`w-12 h-12 rounded-2xl ${
              accent === "yellow" ? "bg-yellow-400/15 border-yellow-400/20" : "bg-blue-400/15 border-blue-400/20"
            } border flex items-center justify-center text-2xl mb-4 animate-scale-pulse`}
          >
            {icon}
          </div>

          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Текущий расход</p>

          <div className="text-5xl font-bold tracking-tighter mb-1">
            {savedUsage === null ? "—" : savedUsage}
            <span className={`text-2xl font-semibold ${accentText}/70`}> {unitLabel}</span>
          </div>

          <p className="text-xs text-zinc-600">
            {savedEntry ? "Данные сохранены" : "Введите значения и сохраните для этого месяца"}
          </p>

          <ProgressBar value={percent} color={progressGradientClass} />

          <div className="flex justify-between mt-2">
            <span className="text-[11px] text-zinc-600">
              0 {unitLabel}
            </span>
            <span className={`text-[11px] ${accentText}/70`}>{savedEntry ? `${percent}%` : "—"}</span>
            <span className="text-[11px] text-zinc-600">
              {targetUsage} {unitLabel}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-zinc-300">Введите значения</p>
            <p className="text-xs text-zinc-500 mt-1">Отдельно для каждого месяца</p>
          </div>
          <div className="text-xs text-zinc-500">
            {savePulse === "ok" ? (
              <span className="px-2 py-1 rounded-xl border bg-green-500/15 border-green-400/20 text-green-400 font-semibold">
                Сохранено
              </span>
            ) : savePulse === "err" ? (
              <span className="px-2 py-1 rounded-xl border bg-red-500/15 border-red-400/20 text-red-400 font-semibold">
                Проверьте поля
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <GlassInput
            label={`Расход (${unitLabel})`}
            value={draft?.usageStr ?? ""}
            onChange={(v) => setDraft({ ...draft, usageStr: v })}
            placeholder={kind === "electricity" ? "например, 243" : "например, 12"}
          />
          <GlassInput
            label="Показания счетчика"
            value={draft?.meterReadingStr ?? ""}
            onChange={(v) => setDraft({ ...draft, meterReadingStr: v })}
            placeholder={kind === "electricity" ? "например, 12345" : "например, 123"}
          />
          <GlassInput
            label="Всего по оплате"
            value={draft?.costStr ?? ""}
            onChange={(v) => setDraft({ ...draft, costStr: v })}
            placeholder="например, 560"
            suffix="₴"
          />
        </div>

        <div className="mt-4">
          <PrimaryButton
            onClick={onSaveClick}
            disabled={!isValid}
            className={accent === "yellow" ? "hover:shadow-[0_0_0_1px_rgba(234,179,8,0.25)]" : "hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"}
          >
            Сохранить данные
          </PrimaryButton>
        </div>

        {savedEntry ? (
          <div className="mt-4 text-xs text-zinc-500">
            Сохранено: <span className={accentText}>{savedEntry.usage}</span> {unitLabel} •{" "}
            <span className={accentText}>{savedEntry.cost} ₴</span>
            {savedEntry.meterReading && <> • <span className={accentText}>Счётчик: {savedEntry.meterReading}</span></>}
          </div>
        ) : (
          <div className="mt-4 text-xs text-zinc-500">Пока нет сохранённых данных для этого месяца.</div>
        )}
      </Card>
    </div>
  );
}

/* ─── Electricity tab ─────────────────────────────────────── */
function ElectricityTab({
  month,
  year,
  years,
  onChangeMonth,
  onChangeYear,
  draft,
  setDraft,
  savedEntry,
  onSave,
  pricePerUnit,
}: {
  month: number;
  year: number;
  years: number[];
  onChangeMonth: (m: number) => void;
  onChangeYear: (y: number) => void;
  draft: DraftEntry;
  setDraft: (next: DraftEntry) => void;
  savedEntry?: UsageEntry;
  onSave: () => void;
  pricePerUnit: string;
}) {
  return (
    <UtilityUsageTab
      kind="electricity"
      title="Электричество"
      icon="⚡"
      accent="yellow"
      month={month}
      year={year}
      years={years}
      onChangeMonth={onChangeMonth}
      onChangeYear={onChangeYear}
      draft={draft}
      setDraft={setDraft}
      savedEntry={savedEntry}
      onSave={onSave}
      unitLabel="kWh"
      targetUsage={390}
      progressGradientClass="bg-gradient-to-r from-yellow-500 to-amber-400"
      pricePerUnit={pricePerUnit}
    />
  );
}

/* ─── Water tab ───────────────────────────────────────────── */
function WaterTab({
  month,
  year,
  years,
  onChangeMonth,
  onChangeYear,
  draft,
  setDraft,
  savedEntry,
  onSave,
  pricePerUnit,
}: {
  month: number;
  year: number;
  years: number[];
  onChangeMonth: (m: number) => void;
  onChangeYear: (y: number) => void;
  draft: DraftEntry;
  setDraft: (next: DraftEntry) => void;
  savedEntry?: UsageEntry;
  onSave: () => void;
  pricePerUnit: string;
}) {
  return (
    <UtilityUsageTab
      kind="water"
      title="Водоснабжение"
      icon="💧"
      accent="blue"
      month={month}
      year={year}
      years={years}
      onChangeMonth={onChangeMonth}
      onChangeYear={onChangeYear}
      draft={draft}
      setDraft={setDraft}
      savedEntry={savedEntry}
      onSave={onSave}
      unitLabel="м³"
      targetUsage={25}
      progressGradientClass="bg-gradient-to-r from-blue-600 to-cyan-400"
      pricePerUnit={pricePerUnit}
    />
  );
}

/* ─── Planner tab ─────────────────────────────────────────── */
function PlannerTab({
  month,
  year,
  years,
  onChangeMonth,
  onChangeYear,
  selectedDay,
  onSelectDay,
  tasks,
  setTasks,
}: {
  month: number;
  year: number;
  years: number[];
  onChangeMonth: (m: number) => void;
  onChangeYear: (y: number) => void;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  tasks: Record<string, PlannerTask[]>;
  setTasks: React.Dispatch<React.SetStateAction<Record<string, PlannerTask[]>>>;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");

  const selectedKey = ymdKey(year, month, selectedDay);
  const dayTasks = tasks[selectedKey] || [];

  // Count tasks only for current month
  const currentMonthTasks: PlannerTask[] = [];
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const key = ymdKey(year, month, day);
    if (tasks[key]) {
      currentMonthTasks.push(...tasks[key]);
    }
  }
  const totalTasks = currentMonthTasks.length;
  const completedTasks = currentMonthTasks.filter(t => t.status === "completed").length;

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => {
      const updated = { ...prev };
      updated[selectedKey] = updated[selectedKey].map(task =>
        task.id === taskId
          ? { ...task, status: task.status === "completed" ? "planned" : "completed" }
          : task
      );
      return updated;
    });
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: PlannerTask = {
      id: `custom-${Date.now()}`,
      title: newTaskTitle,
      status: "planned",
    };
    setTasks(prev => ({
      ...prev,
      [selectedKey]: [...(prev[selectedKey] || []), newTask],
    }));
    setNewTaskTitle("");
    setNewTaskTime("");
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => {
      const updated = { ...prev };
      updated[selectedKey] = updated[selectedKey].filter(t => t.id !== taskId);
      return updated;
    });
  };

  return (
    <div className="space-y-5 stagger animate-slide-up">

      <div className="pt-2 pb-1">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Организация</p>
        <h2 className="text-3xl font-bold tracking-tight">Планер</h2>
      </div>

      {/* Month/Year picker */}
      <MonthYearPicker
        title="Выберите месяц"
        month={month}
        year={year}
        years={years}
        onChangeMonth={onChangeMonth}
        onChangeYear={onChangeYear}
        accentClass="text-green-400"
      />

      {/* Calendar */}
      <CalendarMonth
        year={year}
        month={month}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        tasksByDate={tasks}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-white animate-scale-pulse">{totalTasks}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Всего</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-green-400 animate-scale-pulse" style={{ animationDelay: "0.1s" }}>{completedTasks}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Готово</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-yellow-400 animate-scale-pulse" style={{ animationDelay: "0.2s" }}>{totalTasks - completedTasks}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Осталось</p>
        </Card>
      </div>

      {/* Selected day tasks */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-zinc-300">
              {selectedDay} {MONTH_NAMES_RU[month - 1]} {year}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{dayTasks.length} задач</p>
          </div>
        </div>

        {/* Add task */}
        <div className="space-y-3 mb-4">
          <GlassInput
            label="Новая задача"
            value={newTaskTitle}
            onChange={setNewTaskTitle}
            placeholder="Например, Оплатить интернет"
            type="text"
          />
          <div className="flex gap-3">
            <GlassInput
              label="Время (опционально)"
              value={newTaskTime}
              onChange={setNewTaskTime}
              placeholder="10:00"
              type="text"
            />
            <PrimaryButton onClick={addTask} disabled={!newTaskTitle.trim()} className="flex-1">
              Добавить
            </PrimaryButton>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {dayTasks.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-4">Нет задач на этот день</p>
          ) : (
            dayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] transition-all duration-300 hover:bg-white/[0.04] hover:scale-[1.01]"
              >
                <button
                  onClick={() => toggleTaskStatus(task.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    task.status === "completed"
                      ? "bg-green-400/30 border-green-400"
                      : "border-white/20 bg-transparent"
                  }`}
                >
                  {task.status === "completed" && <span className="text-green-400 text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm transition-all duration-300 ${
                    task.status === "completed" ? "line-through text-zinc-500" : "text-white"
                  }`}>
                    {task.title}
                  </p>
                  {newTaskTime && (
                    <p className="text-xs text-zinc-500 mt-0.5">{newTaskTime}</p>
                  )}
                </div>
                {!task.id.startsWith("recurring-") && (
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors text-sm hover:scale-110"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

    </div>
  );
}

/* ─── Settings tab ────────────────────────────────────────── */
function SettingsTab({
  electricityPrice,
  setElectricityPrice,
  waterPrice,
  setWaterPrice,
  notificationsEnabled,
  setNotificationsEnabled,
}: {
  electricityPrice: string;
  setElectricityPrice: (v: string) => void;
  waterPrice: string;
  setWaterPrice: (v: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
}) {
  const [autoupd, setAutoupd] = useState(true);

  const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
    <button
      onClick={() => set(!on)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        on ? "bg-blue-500/70" : "bg-white/10"
      } border ${on ? "border-blue-400/40" : "border-white/10"}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
          on ? "left-6" : "left-0.5"
        }`}
      />
    </button>
  );

  const rows = [
    { icon: "🔔", label: "Уведомления",     sub: "Напоминания об оплате",   toggle: true,  on: notificationsEnabled,   set: setNotificationsEnabled },
    { icon: "🔄", label: "Автообновление",   sub: "Обновлять данные каждый час", toggle: true, on: autoupd, set: setAutoupd },
    { icon: "🏠", label: "Адрес",            sub: "ул. Запрудная #44", toggle: false },
  ];

  return (
    <div className="space-y-5 stagger animate-slide-up">

      <div className="pt-2 pb-1">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Приложение</p>
        <h2 className="text-3xl font-bold tracking-tight">Настройки</h2>
      </div>

      {/* Profile card */}
      <Card glow="purple" className="relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none animate-float" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 border border-white/10 flex items-center justify-center text-2xl animate-scale-pulse">
            👤
          </div>
          <div>
            <p className="font-bold text-white text-lg">Мой дом</p>
            <p className="text-sm text-zinc-400">ул. Запрудная #44</p>
            <span className="inline-block mt-1 text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-400/20 px-2 py-0.5 rounded-lg">
              Premium
            </span>
          </div>
        </div>
      </Card>

      {/* Utility pricing */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-base flex-shrink-0 animate-bounce-subtle">
            💰
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Тарифы на коммунальные услуги</p>
            <p className="text-xs text-zinc-500">Цена за единицу измерения</p>
          </div>
        </div>

        <div className="space-y-4">
          <GlassInput
            label="Цена за электричество (₴/kWh)"
            value={electricityPrice}
            onChange={setElectricityPrice}
            placeholder="например, 5.20"
            suffix="₴/kWh"
          />
          <GlassInput
            label="Цена за воду (₴/м³)"
            value={waterPrice}
            onChange={setWaterPrice}
            placeholder="например, 45.00"
            suffix="₴/м³"
          />
        </div>
      </Card>

      {/* Settings rows */}
      <Card>
        <div className="space-y-0.5">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 py-3.5 transition-all duration-300 hover:bg-white/[0.02] rounded-xl px-2 -mx-2 ${
                i < rows.length - 1 ? "border-b border-white/[0.05]" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-base flex-shrink-0 animate-bounce-subtle" style={{ animationDelay: `${i * 0.1}s` }}>
                {row.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{row.label}</p>
                <p className="text-xs text-zinc-500 truncate">{row.sub}</p>
              </div>
              {row.toggle
                ? <Toggle on={row.on!} set={row.set!} />
                : <span className="text-zinc-600 text-sm">›</span>
              }
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-[11px] text-zinc-700 pb-2">
        Home Control v1.0.0 • Dark Premium
      </p>

    </div>
  );
}

/* ─── Main component ──────────────────────────────────────── */
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [prevTab, setPrevTab] = useState<Tab>("home");
  const contentKey = useRef(0);

  // Firestore integration
  const { state: firestoreState, updateData, usingLocalStorage } = useFirestore();

  // PIN authentication state
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const pinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check PIN authentication on mount
  useEffect(() => {
    const authTime = localStorage.getItem('pinAuthTime');
    if (authTime) {
      const timeDiff = Date.now() - parseInt(authTime);
      if (timeDiff < 30 * 60 * 1000) { // 30 minutes
        setIsPinAuthenticated(true);
        // Set timeout to expire authentication
        const remainingTime = 30 * 60 * 1000 - timeDiff;
        pinTimeoutRef.current = setTimeout(() => {
          setIsPinAuthenticated(false);
          localStorage.removeItem('pinAuthTime');
        }, remainingTime);
      }
    }
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (pinTimeoutRef.current) {
        clearTimeout(pinTimeoutRef.current);
      }
    };
  }, []);

  const requirePin = (action: () => void) => {
    if (isPinAuthenticated) {
      action();
    } else {
      setPendingAction(() => action);
      setPinModalOpen(true);
    }
  };

  const handlePinSuccess = () => {
    setIsPinAuthenticated(true);
    setPinModalOpen(false);
    localStorage.setItem('pinAuthTime', Date.now().toString());
    
    // Set 30 minute timeout
    if (pinTimeoutRef.current) {
      clearTimeout(pinTimeoutRef.current);
    }
    pinTimeoutRef.current = setTimeout(() => {
      setIsPinAuthenticated(false);
      localStorage.removeItem('pinAuthTime');
    }, 30 * 60 * 1000);

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Electricity state
  const now = new Date();
  const [electricityMonth, setElectricityMonth] = useState(now.getMonth() + 1);
  const [electricityYear, setElectricityYear] = useState(now.getFullYear());
  const [electricityDraft, setElectricityDraft] = useState<DraftEntry>({ usageStr: "", costStr: "", meterReadingStr: "" });
  const [electricityData, setElectricityData] = useState<Record<string, UsageEntry>>({});

  const electricityYears = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Water state
  const [waterMonth, setWaterMonth] = useState(now.getMonth() + 1);
  const [waterYear, setWaterYear] = useState(now.getFullYear());
  const [waterDraft, setWaterDraft] = useState<DraftEntry>({ usageStr: "", costStr: "", meterReadingStr: "" });
  const [waterData, setWaterData] = useState<Record<string, UsageEntry>>({});

  const waterYears = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Utility pricing state
  const [electricityPrice, setElectricityPrice] = useState("5.20");
  const [waterPrice, setWaterPrice] = useState("45.00");

  // Planner state
  const [plannerMonth, setPlannerMonth] = useState(now.getMonth() + 1);
  const [plannerYear, setPlannerYear] = useState(now.getFullYear());
  const [plannerSelectedDay, setPlannerSelectedDay] = useState(now.getDate());
  const [plannerTasks, setPlannerTasks] = useState<Record<string, PlannerTask[]>>({});

  const plannerYears = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Sync Firestore data to local state
  useEffect(() => {
    if (firestoreState.data) {
      setElectricityData(firestoreState.data.electricity || {});
      setWaterData(firestoreState.data.water || {});
      setPlannerTasks(firestoreState.data.planner || {});
      setElectricityPrice(firestoreState.data.settings?.electricityPrice || "5.20");
      setWaterPrice(firestoreState.data.settings?.waterPrice || "45.00");
      setNotificationsEnabled(firestoreState.data.settings?.notificationsEnabled ?? true);
    }
  }, [firestoreState.data]);

  // Save settings to Firestore when they change
  useEffect(() => {
    if (firestoreState.data) {
      updateData({
        settings: {
          electricityPrice,
          waterPrice,
          notificationsEnabled,
          autoUpdateEnabled: firestoreState.data.settings?.autoUpdateEnabled ?? true
        }
      });
    }
  }, [electricityPrice, waterPrice, notificationsEnabled]);

  // Ensure recurring tasks exist for 1st of each month (current month only)
  useEffect(() => {
    const recurringTasks = [
      { id: "recurring-elec", title: "Снять показания света", status: "planned" as TaskStatus },
      { id: "recurring-water", title: "Снять показания воды", status: "planned" as TaskStatus },
    ];

    setPlannerTasks(prev => {
      const updated = { ...prev };
      // Only check current month
      const key = ymdKey(plannerYear, plannerMonth, 1);
      if (!updated[key]) {
        updated[key] = [...recurringTasks];
      } else {
        // Ensure recurring tasks exist
        const existingIds = updated[key].map(t => t.id);
        recurringTasks.forEach(task => {
          if (!existingIds.includes(task.id)) {
            updated[key] = [...updated[key], task];
          }
        });
      }
      return updated;
    });
  }, [plannerYear, plannerMonth]);

  // Save planner tasks to Firestore when they change
  useEffect(() => {
    if (firestoreState.data) {
      updateData({ planner: plannerTasks });
    }
  }, [plannerTasks]);

  // Load draft for current month when month/year changes
  useEffect(() => {
    const key = ymKey(electricityYear, electricityMonth);
    const entry = electricityData[key];
    if (entry) {
      setElectricityDraft({ usageStr: String(entry.usage), costStr: String(entry.cost), meterReadingStr: entry.meterReading ? String(entry.meterReading) : "" });
    } else {
      setElectricityDraft({ usageStr: "", costStr: "", meterReadingStr: "" });
    }
  }, [electricityYear, electricityMonth, electricityData]);

  // Load draft for water when month/year changes
  useEffect(() => {
    const key = ymKey(waterYear, waterMonth);
    const entry = waterData[key];
    if (entry) {
      setWaterDraft({ usageStr: String(entry.usage), costStr: String(entry.cost), meterReadingStr: entry.meterReading ? String(entry.meterReading) : "" });
    } else {
      setWaterDraft({ usageStr: "", costStr: "", meterReadingStr: "" });
    }
  }, [waterYear, waterMonth, waterData]);

  const handleElectricitySave = () => {
    const usageNum = Number(electricityDraft.usageStr);
    const costNum = Number(electricityDraft.costStr);
    const meterReadingNum = electricityDraft.meterReadingStr ? Number(electricityDraft.meterReadingStr) : undefined;
    if (!Number.isFinite(usageNum) || !Number.isFinite(costNum)) return;

    const key = ymKey(electricityYear, electricityMonth);
    const newData = { ...electricityData, [key]: { usage: usageNum, cost: costNum, meterReading: meterReadingNum } };
    setElectricityData(newData);
    updateData({ electricity: newData });
  };

  const handleElectricitySaveWithPin = () => {
    requirePin(handleElectricitySave);
  };

  const handleWaterSave = () => {
    const usageNum = Number(waterDraft.usageStr);
    const costNum = Number(waterDraft.costStr);
    const meterReadingNum = waterDraft.meterReadingStr ? Number(waterDraft.meterReadingStr) : undefined;
    if (!Number.isFinite(usageNum) || !Number.isFinite(costNum)) return;

    const key = ymKey(waterYear, waterMonth);
    const newData = { ...waterData, [key]: { usage: usageNum, cost: costNum, meterReading: meterReadingNum } };
    setWaterData(newData);
    updateData({ water: newData });
  };

  const handleWaterSaveWithPin = () => {
    requirePin(handleWaterSave);
  };

  const handleSetElectricityPrice = (value: string) => {
    requirePin(() => setElectricityPrice(value));
  };

  const handleSetWaterPrice = (value: string) => {
    requirePin(() => setWaterPrice(value));
  };

  const navigate = (tab: Tab) => {
    if (tab === activeTab) return;
    contentKey.current += 1;
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  // Loading and error handling
  if (firestoreState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-400/30 border-t-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Only show error if both Firebase and localStorage failed
  if (firestoreState.error && !firestoreState.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14] p-4">
        <div className="glass rounded-3xl p-6 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-400/30 flex items-center justify-center text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <p className="text-white font-semibold mb-2">Ошибка загрузки</p>
          <p className="text-zinc-400 text-sm mb-4">{firestoreState.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400 text-sm hover:bg-blue-500/30 transition"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "electricity": return (
        <ElectricityTab
          key={contentKey.current}
          month={electricityMonth}
          year={electricityYear}
          years={electricityYears}
          onChangeMonth={setElectricityMonth}
          onChangeYear={setElectricityYear}
          draft={electricityDraft}
          setDraft={setElectricityDraft}
          savedEntry={electricityData[ymKey(electricityYear, electricityMonth)]}
          onSave={handleElectricitySaveWithPin}
          pricePerUnit={electricityPrice}
        />
      );
      case "water":       return (
        <WaterTab
          key={contentKey.current}
          month={waterMonth}
          year={waterYear}
          years={waterYears}
          onChangeMonth={setWaterMonth}
          onChangeYear={setWaterYear}
          draft={waterDraft}
          setDraft={setWaterDraft}
          savedEntry={waterData[ymKey(waterYear, waterMonth)]}
          onSave={handleWaterSaveWithPin}
          pricePerUnit={waterPrice}
        />
      );
      case "planner":     return (
        <PlannerTab
          key={contentKey.current}
          month={plannerMonth}
          year={plannerYear}
          years={plannerYears}
          onChangeMonth={setPlannerMonth}
          onChangeYear={setPlannerYear}
          selectedDay={plannerSelectedDay}
          onSelectDay={setPlannerSelectedDay}
          tasks={plannerTasks}
          setTasks={setPlannerTasks}
        />
      );
      case "settings":    return (
        <SettingsTab
          key={contentKey.current}
          electricityPrice={electricityPrice}
          setElectricityPrice={handleSetElectricityPrice}
          waterPrice={waterPrice}
          setWaterPrice={handleSetWaterPrice}
          notificationsEnabled={notificationsEnabled}
          setNotificationsEnabled={setNotificationsEnabled}
        />
      );
      default:            return (
        <HomeTab
          key={contentKey.current}
          onNavigate={navigate}
          electricityData={electricityData}
          waterData={waterData}
          electricityMonth={electricityMonth}
          electricityYear={electricityYear}
          waterMonth={waterMonth}
          waterYear={waterYear}
          notificationsEnabled={notificationsEnabled}
          plannerTasks={plannerTasks}
        />
      );
    }
  };

  const activeTabMeta = tabs.find(t => t.id === activeTab)!;

  return (
    <>
      {/* Animated background */}
      <div className="mesh-bg" />

      <main className="relative z-10 min-h-screen text-white pb-32 overflow-x-hidden">
        <div className="max-w-md mx-auto px-5 pt-6">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5">
        <div className="max-w-md mx-auto">
          <div className="glass-strong rounded-[28px] p-3 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <div className="flex justify-around">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate(tab.id)}
                    className="flex flex-col items-center gap-1 px-2 py-1 relative transition-all duration-300 hover:scale-105"
                  >
                    {/* active pill */}
                    {isActive && (
                      <span
                        className="absolute inset-0 rounded-2xl bg-white/[0.07] animate-scale-in"
                        style={{ margin: "-4px -6px" }}
                      />
                    )}
                    <span
                      className={`text-2xl transition-all duration-300 relative ${
                        isActive ? "scale-110 animate-bounce-subtle" : "scale-100 opacity-50"
                      }`}
                    >
                      {tab.emoji}
                    </span>
                    <span
                      className={`text-[10px] font-medium transition-all duration-300 relative ${
                        isActive ? tab.color : "text-zinc-600"
                      }`}
                    >
                      {tab.label}
                    </span>
                    {/* active dot */}
                    <span
                      className={`nav-dot transition-all duration-300 ${
                        isActive ? `bg-current ${tab.color} opacity-100 animate-pulse-slow` : "opacity-0 scale-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* PIN Modal */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSuccess={handlePinSuccess}
      />

      {/* AI Chat Widget */}
      <AIChatWidget 
        appContext={{
          electricityData,
          waterData,
          electricityPrice,
          waterPrice,
          plannerTasks,
          electricityMonth,
          electricityYear,
          waterMonth,
          waterYear,
        }}
      />
    </>
  );
}
