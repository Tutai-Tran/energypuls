"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyze,
  savingsEUR,
  currentHour,
  amsterdamDate,
  amsterdamHour,
  fmtEUR,
  fmtHour,
  type Analysis,
  type PricePoint,
} from "@/lib/energy";

function Bars({ a, nowHour }: { a: Analysis; nowHour: number | null }) {
  const max = Math.max(...a.hours.map((h) => h.price), 0.01);
  return (
    <div className="chart">
      <div className="bars">
        {a.hours.map((h) => (
          <div
            key={h.t}
            className={"bar" + (nowHour === h.hour ? " is-now" : "")}
            title={`${fmtHour(h.hour)} — ${fmtEUR(h.price)}/kWh`}
          >
            <div
              className={`bar__fill bg-${h.cls}`}
              style={{ height: `${Math.max(3, (Math.max(h.price, 0) / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="axis">
        {a.hours.map((h) => (
          <span key={h.t}>{h.hour % 3 === 0 ? String(h.hour).padStart(2, "0") : ""}</span>
        ))}
      </div>
    </div>
  );
}

function Windows({ a }: { a: Analysis }) {
  if (!a.best || !a.worst) return null;
  return (
    <div className="windows">
      <div className="win">
        <div className="win__label">
          <span className="d bg-cheap" /> Cheapest window — run heavy loads
        </div>
        <div className="win__time c-cheap">
          {fmtHour(a.best.startHour)}–{fmtHour(a.best.endHour)}
        </div>
        <div className="win__avg">avg {fmtEUR(a.best.avg)}/kWh</div>
      </div>
      <div className="win">
        <div className="win__label">
          <span className="d bg-high" /> Peak window — avoid / export solar
        </div>
        <div className="win__time c-high">
          {fmtHour(a.worst.startHour)}–{fmtHour(a.worst.endHour)}
        </div>
        <div className="win__avg">avg {fmtEUR(a.worst.avg)}/kWh</div>
      </div>
    </div>
  );
}

export default function EnergyDashboard({ points, asOf }: { points: PricePoint[]; asOf: string }) {
  const [nowHour, setNowHour] = useState<number | null>(null);
  const [kwh, setKwh] = useState(10);

  useEffect(() => {
    const tick = () => setNowHour(amsterdamHour(new Date().toISOString()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const { aToday, aTmr } = useMemo(() => {
    const todayStr = amsterdamDate(asOf);
    const tmrStr = amsterdamDate(new Date(new Date(asOf).getTime() + 864e5).toISOString());
    const today = points.filter((p) => amsterdamDate(p.t) === todayStr);
    const tomorrow = points.filter((p) => amsterdamDate(p.t) === tmrStr);
    return { aToday: analyze(today), aTmr: analyze(tomorrow) };
  }, [points, asOf]);

  const cur = currentHour(aToday, nowHour ?? -1);
  const saving = savingsEUR(aToday, kwh);

  const heroCls = cur?.cls ?? "mid";
  const heroMsg =
    !cur
      ? "No live price for the current hour"
      : cur.cls === "cheap"
        ? "Cheap right now"
        : cur.cls === "high"
          ? "Expensive right now"
          : "Around today's average";
  const heroSub =
    !cur
      ? "Prices may not yet cover this hour."
      : cur.cls === "cheap"
        ? "Good time to run heavy loads or charge the battery."
        : cur.cls === "high"
          ? "Hold off if you can — or export your solar."
          : "Neutral — no rush either way.";

  return (
    <main className="wrap">
      <div className="head">
        <h1>
          Energy<span className="spark">Puls</span> ⚡
        </h1>
        <p>Dutch day-ahead electricity — when to run, when to wait.</p>
      </div>

      {!aToday ? (
        <div className="empty">
          Couldn&apos;t load day-ahead prices right now. They come from EnergyZero and refresh
          automatically — try again in a moment.
        </div>
      ) : (
        <>
          <div className="hero" data-cls={heroCls}>
            <span className={`hero__dot bg-${heroCls}`} />
            <div>
              <span className="hero__price">{cur ? fmtEUR(cur.price) : "—"}</span>{" "}
              <span className="hero__unit">/kWh now</span>
              <div className="hero__sub">
                today: low {fmtEUR(aToday.min)} · avg {fmtEUR(aToday.avg)} · high {fmtEUR(aToday.max)}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div className={`hero__msg c-${heroCls}`}>{heroMsg}</div>
              <div className="hero__sub">{heroSub}</div>
            </div>
          </div>

          <div className="section">
            <div className="section__title">Today · hourly price</div>
            <Bars a={aToday} nowHour={nowHour} />
            <Windows a={aToday} />
            <div className="saver">
              <div className="saver__row">
                <span className="saver__kwh">{kwh} kWh</span>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={kwh}
                  onChange={(e) => setKwh(Number(e.target.value))}
                  aria-label="flexible load in kWh"
                />
              </div>
              <div className="saver__out">
                Shift {kwh} kWh into the cheapest window and save{" "}
                <b>€{saving.toFixed(2)}</b> vs. running it at today&apos;s average price.
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section__title">Tomorrow</div>
            {aTmr ? (
              <>
                <div className="section__sub">
                  cheapest {fmtHour(aTmr.best!.startHour)}–{fmtHour(aTmr.best!.endHour)} (
                  {fmtEUR(aTmr.best!.avg)}) · peak {fmtHour(aTmr.worst!.startHour)}–
                  {fmtHour(aTmr.worst!.endHour)} ({fmtEUR(aTmr.worst!.avg)})
                </div>
                <Bars a={aTmr} nowHour={null} />
              </>
            ) : (
              <div className="empty">
                Tomorrow&apos;s prices are published around 13:00 (CET). Check back this afternoon.
              </div>
            )}
          </div>
        </>
      )}

      <div className="foot">
        Prices: EnergyZero day-ahead spot, incl. VAT, Amsterdam time. Informational only — not
        financial or energy advice. An Oryven build.
      </div>
    </main>
  );
}
