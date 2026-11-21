import { NextResponse } from "next/server";

/**
 * Weather for the *visitor's* location.
 *
 * On Vercel, the platform adds geo headers to every request
 * (`x-vercel-ip-latitude` / `-longitude` / `-city`) — no permission prompt, no
 * third-party service. We read those and fetch the weather from open-meteo
 * (free, keyless).
 *
 * When there are no geo headers (localhost / off Vercel) we fall back to the
 * NEAS home office rather than showing "your town", so the panel still reads
 * correctly in local development and on any non-Vercel host.
 */
const FALLBACK = { lat: 14.7583, lon: 120.9478, city: "Marilao, Bulacan" }; // NEAS OPC
export const dynamic = "force-dynamic"; // per-visitor: reads geo headers

export async function GET(request: Request) {
  const h = request.headers;
  const lat = h.get("x-vercel-ip-latitude");
  const lon = h.get("x-vercel-ip-longitude");

  const usingFallback = !lat || !lon;
  const latitude = lat ?? String(FALLBACK.lat);
  const longitude = lon ?? String(FALLBACK.lon);

  const cityHeader = h.get("x-vercel-ip-city");
  const city = usingFallback
    ? FALLBACK.city
    : cityHeader ? decodeURIComponent(cityHeader) : FALLBACK.city;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;
    // Cache per-coordinate for 10 min so repeat visitors from the same city
    // don't each trigger a fresh upstream call.
    const r = await fetch(url, { next: { revalidate: 600 } });
    const d = await r.json();
    return NextResponse.json({ current: d.current ?? null, city });
  } catch {
    return NextResponse.json({ current: null, city });
  }
}
