import EnergyDashboard from "@/components/EnergyDashboard";
import type { PricePoint } from "@/lib/energy";

export const revalidate = 900; // re-fetch day-ahead prices at most every 15 min

async function fetchPrices(): Promise<PricePoint[]> {
  // Pull a 72h UTC window (yesterday → day after tomorrow) and let the client split it into
  // today / tomorrow by Amsterdam date. EnergyZero's public day-ahead feed needs no key.
  const now = Date.now();
  const from = new Date(now - 864e5).toISOString();
  const till = new Date(now + 1728e5).toISOString();
  const url =
    `https://api.energyzero.nl/v1/energyprices?fromDate=${from}&tillDate=${till}` +
    `&interval=4&usageType=1&inclBtw=true`;
  try {
    const r = await fetch(url, {
      next: { revalidate: 900 },
      headers: { "User-Agent": "EnergyPuls/0.1 (+oryven)" },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.Prices || []).map((x: { readingDate: string; price: number }) => ({
      t: x.readingDate,
      price: x.price,
    }));
  } catch {
    return [];
  }
}

export default async function Page() {
  const points = await fetchPrices();
  return <EnergyDashboard points={points} asOf={new Date().toISOString()} />;
}
