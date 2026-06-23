// Unit + integration test for the EnergyPuls analysis core. Run: npm test
import { analyze, savingsEUR, currentHour, amsterdamHour } from "../lib/energy.ts";

let failed = 0;
function ok(name: string, cond: boolean, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!cond) failed++;
}

// --- 1. deterministic synthetic case (24h, cheapest run is hours 2-4) ---
const base = Array.from({ length: 24 }, (_, h) => {
  // night cheap, evening peak
  let p = 0.2;
  if (h >= 2 && h <= 4) p = 0.05; // cheapest window
  if (h >= 18 && h <= 20) p = 0.45; // peak
  return { t: `2026-06-24T${String(h).padStart(2, "0")}:30:00Z`, price: p };
});
const a = analyze(base, 3);
ok("analyze returns a result", !!a);
ok("count = 24", a!.count === 24, String(a!.count));
ok("min = 0.05", a!.min === 0.05, String(a!.min));
ok("max = 0.45", a!.max === 0.45, String(a!.max));
ok("cheapest window avg ≈ 0.05", a!.best!.avg <= 0.06, JSON.stringify(a!.best));
ok("priciest window avg ≈ 0.45", a!.worst!.avg >= 0.4, JSON.stringify(a!.worst));
// cheapest UTC hours 2-4 -> Amsterdam summer (UTC+2) hours 4-6
ok("cheapest window is in the early morning (Amsterdam)", a!.best!.startHour >= 3 && a!.best!.startHour <= 6, JSON.stringify(a!.best));
ok("a cheap hour is classified 'cheap'", a!.hours.some((h) => h.cls === "cheap"));
ok("a peak hour is classified 'high'", a!.hours.some((h) => h.cls === "high"));
ok("savings for 10kWh is positive", savingsEUR(a, 10) > 0, "€" + savingsEUR(a, 10));
ok("currentHour resolves a known Amsterdam hour", !!currentHour(a, a!.hours[0].hour));

// --- 2. edge cases ---
ok("empty -> null", analyze([]) === null);
ok("single point -> 1h window", analyze([{ t: "2026-06-24T10:00:00Z", price: 0.3 }])!.best!.avg === 0.3);
ok("amsterdamHour DST summer: 00:00Z -> 02:00", amsterdamHour("2026-06-24T00:00:00Z") === 2, String(amsterdamHour("2026-06-24T00:00:00Z")));

// --- 3. integration: real EnergyZero data ---
const now = Date.now();
const url = `https://api.energyzero.nl/v1/energyprices?fromDate=${new Date(now - 864e5).toISOString()}&tillDate=${new Date(now + 1728e5).toISOString()}&interval=4&usageType=1&inclBtw=true`;
try {
  const r = await fetch(url, { headers: { "User-Agent": "EnergyPuls-test/0.1" } });
  const j: any = await r.json();
  const pts = (j.Prices || []).map((x: any) => ({ t: x.readingDate, price: x.price }));
  ok("live: fetched >= 20 hourly prices", pts.length >= 20, String(pts.length));
  const la = analyze(pts, 3);
  ok("live: analyze produces a cheapest window", !!la?.best, JSON.stringify(la?.best));
  ok("live: avg is a plausible NL price (0..2 €/kWh)", la!.avg > 0 && la!.avg < 2, String(la!.avg));
  ok("live: every hour classified", la!.hours.every((h) => ["cheap", "mid", "high"].includes(h.cls)));
  console.log(`\nLIVE today/tomorrow: ${pts.length} pts, avg €${la!.avg}, cheapest ${la!.best!.startHour}:00-${la!.best!.endHour}:00 @ €${la!.best!.avg}, peak ${la!.worst!.startHour}:00-${la!.worst!.endHour}:00 @ €${la!.worst!.avg}`);
} catch (e) {
  ok("live fetch", false, String(e));
}

console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
