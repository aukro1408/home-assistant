import { useEffect, useState } from "react";
import { Card } from "./page"; // Assuming Card is exported from page.tsx

type ExchangeRate = {
  r030: number;
  txt: string;
  rate: number;
  cc: string;
  exchangedate: string;
};

type CurrencyData = {
  usd: ExchangeRate | null;
  eur: ExchangeRate | null;
};

const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

export function CurrencyWidget() {
  const [currencies, setCurrencies] = useState<CurrencyData>({ usd: null, eur: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchRates = async () => {
    try {
      const response = await fetch(
        "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ExchangeRate[] = await response.json();

      const usd = data.find((rate) => rate.cc === "USD") || null;
      const eur = data.find((rate) => rate.cc === "EUR") || null;

      setCurrencies({ usd, eur });
      setLastUpdate(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <Card className="p-5 text-center text-zinc-400">Загрузка курсов...</Card>;
  }

  if (error) {
    return <Card className="p-5 text-center text-red-400">Ошибка: {error}</Card>;
  }

  return (
    <Card glow="blue" className="relative overflow-hidden animate-slide-up backdrop-blur-md">
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
            Валютные курсы
          </p>
          {lastUpdate && (
            <p className="text-xs text-zinc-500">
              Обновлено: {lastUpdate}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {currencies.usd && (
            <div className="backdrop-blur-sm bg-white/5 rounded-3xl p-5 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">
                    {currencies.usd.cc}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {currencies.usd.rate.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    за 1 {currencies.usd.cc}
                  </p>
                </div>
                <div className="text-5xl">💵</div>
              </div>
            </div>
          )}

          {currencies.eur && (
            <div className="backdrop-blur-sm bg-white/5 rounded-3xl p-5 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">
                    {currencies.eur.cc}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {currencies.eur.rate.toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    за 1 {currencies.eur.cc}
                  </p>
                </div>
                <div className="text-5xl">💶</div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-zinc-600 pt-2 border-t border-white/10">
          Курсы НБУ для безналичных операций
        </div>
      </div>
    </Card>
  );
}
