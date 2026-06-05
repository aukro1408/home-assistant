export const MONTH_NAMES_RU = [
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

export const WEEKDAY_SHORT_RU_MONDAY_FIRST = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function ymKey(year: number, month: number) {
  return `${year}-${pad2(month)}`; // month: 1..12
}

export function getLatestAvailableMonth(
  data: Record<string, any>,
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

export function ymdKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`; // month/day: 1..*
}

export function daysInMonth(year: number, month: number) {
  // month: 1..12
  return new Date(year, month, 0).getDate();
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
