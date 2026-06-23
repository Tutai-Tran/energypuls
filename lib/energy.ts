// EnergyPuls core: pure analysis of Dutch day-ahead electricity prices.
// Kept free of fetch/DOM so it is unit-testable in plain node and reusable on client + server.

export const TZ = "Europe/Amsterdam";

export type PricePoint = { t: string; price: number }; // t = ISO UTC instant, price = €/kWh incl. VAT
export type Cls = "cheap" | "mid" | "high";
export type Hour = { t: string; price: number; cls: Cls; hour: number };
export type Window = { startHour: number; endHour: number; avg: number };
export type Analysis = {
  count: number;
  avg: number;
  min: number;
  max: number;
  hours: Hour[];
  best: Window | null; // cheapest consecutive window — when to run heavy loads
  worst: Window | null; // priciest consecutive window — when to avoid / export solar
};

const round = (n: number, p = 3) => Math.round(n * 10 ** p) / 10 ** p;

/** Hour-of-day (0-23) in Amsterdam local time for a UTC instant — DST-correct. */
export function amsterdamHour(iso: string): number {
  const s = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date(iso));
  return parseInt(s, 10) % 24;
}

/** Amsterdam calendar date (YYYY-MM-DD) for a UTC instant — used to split today vs tomorrow. */
export function amsterdamDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function classify(price: number, avg: number): Cls {
  if (price <= avg * 0.85) return "cheap";
  if (price >= avg * 1.15) return "high";
  return "mid";
}

/** Lowest- (or highest-) average run of `len` consecutive hours. */
function window(hours: Hour[], len: number, wantMin: boolean): Window | null {
  if (hours.length === 0) return null;
  const n = Math.min(len, hours.length);
  let bestI = 0;
  let bestAvg = wantMin ? Infinity : -Infinity;
  for (let i = 0; i + n <= hours.length; i++) {
    let sum = 0;
    for (let j = i; j < i + n; j++) sum += hours[j].price;
    const a = sum / n;
    if ((wantMin && a < bestAvg) || (!wantMin && a > bestAvg)) {
      bestAvg = a;
      bestI = i;
    }
  }
  const start = hours[bestI];
  const end = hours[bestI + n - 1];
  return { startHour: start.hour, endHour: (end.hour + 1) % 24, avg: round(bestAvg) };
}

export function analyze(points: PricePoint[], windowLen = 3): Analysis | null {
  if (!points || points.length === 0) return null;
  const prices = points.map((p) => p.price);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const hours: Hour[] = points.map((p) => ({
    t: p.t,
    price: p.price,
    hour: amsterdamHour(p.t),
    cls: classify(p.price, avg),
  }));
  return {
    count: points.length,
    avg: round(avg),
    min: round(Math.min(...prices)),
    max: round(Math.max(...prices)),
    hours,
    best: window(hours, windowLen, true),
    worst: window(hours, windowLen, false),
  };
}

/** € saved by running `kWh` of flexible load in the cheapest window vs. the day's average. */
export function savingsEUR(a: Analysis | null, kWh: number): number {
  if (!a || !a.best) return 0;
  return round((a.avg - a.best.avg) * kWh, 2);
}

/** The hour record matching the current Amsterdam hour, if present. */
export function currentHour(a: Analysis | null, nowHour: number): Hour | null {
  if (!a) return null;
  return a.hours.find((h) => h.hour === nowHour) ?? null;
}

export const fmtEUR = (n: number) => "€" + n.toFixed(3);
export const fmtHour = (h: number) => String(h).padStart(2, "0") + ":00";
