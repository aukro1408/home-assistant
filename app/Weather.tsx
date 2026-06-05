import { useEffect, useState } from "react";
import { Card } from "./page"; // Assuming Card is exported from page.tsx

const LATITUDE = 46.8434;
const LONGITUDE = 30.0792;
const CITY_NAME = "Rozdilna";
const LANG = "ru";
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

type ForecastDay = {
  date: string;
  day: {
    avgtemp_c: number;
    maxtemp_c: number;
    mintemp_c: number;
    condition: {
      text: string;
      icon: string;
    };
  };
};

type WeatherData = {
  current: {
    temp_c: number;
    humidity: number;
    wind_kph: number;
    condition: {
      text: string;
      icon: string;
    };
  };
  location: {
    name: string;
  };
  forecast: {
    forecastday: ForecastDay[];
  };
};

const formatForecastDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
};

const getForecastLabel = (dateString: string) => {
  const forecastDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((forecastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Завтра";
  if (diffDays === 2) return "Послезавтра";
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(forecastDate);
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&q=${LATITUDE},${LONGITUDE}&lang=${LANG}&days=3`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: WeatherData = await response.json();
      setWeather(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Card className="p-5 text-center text-zinc-400">Загрузка погоды...</Card>;
  }

  if (error) {
    return <Card className="p-5 text-center text-red-400">Ошибка: {error}</Card>;
  }

  if (!weather) {
    return null;
  }

  const iconUrl = weather.current.condition.icon.startsWith("http")
    ? weather.current.condition.icon
    : `https:${weather.current.condition.icon}`;
  const forecastDays = weather.forecast.forecastday.slice(0, 3);

  return (
    <Card glow="purple" className="relative overflow-hidden animate-slide-up backdrop-blur-md">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <div className="relative backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 space-y-6">
        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-0 font-semibold">
          Погода
        </p>

        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={iconUrl}
              alt={weather.current.condition.text}
              className="w-24 h-24 drop-shadow-lg flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-5xl font-bold text-white leading-none">
                {Math.round(weather.current.temp_c)}°
              </p>
              <p className="text-sm text-zinc-400 mt-1 truncate">{CITY_NAME}</p>
              <p className="text-sm text-zinc-500 mt-0.5 capitalize truncate">
                {weather.current.condition.text}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="backdrop-blur-sm bg-white/5 rounded-3xl p-3 border border-white/10">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Влажность
            </p>
            <p className="text-xl font-semibold text-white">
              {weather.current.humidity}%
            </p>
          </div>
          <div className="backdrop-blur-sm bg-white/5 rounded-3xl p-3 border border-white/10">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Ветер
            </p>
            <p className="text-xl font-semibold text-white">
              {Math.round(weather.current.wind_kph)} км/ч
            </p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {forecastDays.map((day) => {
            const dayIcon = day.day.condition.icon.startsWith("http")
              ? day.day.condition.icon
              : `https:${day.day.condition.icon}`;

            return (
              <div
                key={day.date}
                className="border border-white/10 rounded-3xl bg-white/5 p-3 shadow-inner shadow-black/5 flex-shrink-0 w-[140px] flex flex-col"
              >
                <p className="text-xs text-white/70 truncate mb-2">
                  {formatForecastDate(day.date)}
                </p>
                <p className="text-base font-semibold text-white mb-2">
                  {Math.round(day.day.mintemp_c)}° / {Math.round(day.day.maxtemp_c)}°
                </p>
                <div className="flex items-center gap-2 flex-1">
                  <img src={dayIcon} alt={day.day.condition.text} className="w-10 h-10 flex-shrink-0" />
                  <p className="text-[10px] text-zinc-400 capitalize line-clamp-2">
                    {day.day.condition.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
