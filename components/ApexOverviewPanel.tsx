"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Camera,
  PlayCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

const ACCENT = "#d4a64f";
const WEATHER_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  80: "Showers",
  81: "Showers",
  82: "Showers",
  95: "Storm",
  96: "Storm",
  99: "Storm",
};

type Tile = {
  key: string;
  icon: LucideIcon;
  label: string;
  href: string;
};

type WeatherPayload = {
  city?: string;
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
};

type WeatherState = {
  temp: number | null;
  code: number | null;
  city: string;
};

// NEAS public profiles. Use familiar Lucide symbols rather than unavailable
// brand exports; the destination and accessible label identify each network.
const TILES: Tile[] = [
  {
    key: "linkedin",
    icon: BriefcaseBusiness,
    label: "NEAS on LinkedIn",
    href: "https://www.linkedin.com/company/nextedge-access-solutions-neas",
  },
  {
    key: "facebook",
    icon: Users,
    label: "NEAS on Facebook",
    href: "https://www.facebook.com/NextEdgeAccessSolutionss",
  },
  {
    key: "instagram",
    icon: Camera,
    label: "NEAS on Instagram",
    href: "https://www.instagram.com/nextedgeaccesssolutions",
  },
  {
    key: "youtube",
    icon: PlayCircle,
    label: "NEAS on YouTube",
    href: "https://www.youtube.com/@NextEdgeAccessSolutions",
  },
];

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherState | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();

    const intervalId = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadWeather = async () => {
      try {
        const response = await fetch("/api/weather", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Weather request failed: ${response.status}`);
        }

        const data = (await response.json()) as WeatherPayload;
        const temperature = data.current?.temperature_2m;
        const weatherCode = data.current?.weather_code;

        setWeather({
          temp:
            typeof temperature === "number" && Number.isFinite(temperature)
              ? temperature
              : null,
          code: typeof weatherCode === "number" ? weatherCode : null,
          city: data.city?.trim() || "Your town",
        });
      } catch {
        if (!controller.signal.aborted) {
          // Weather is supplemental; keep the clock usable when the endpoint
          // is unavailable and avoid noisy console errors for visitors.
          setWeather(null);
        }
      }
    };

    void loadWeather();
    const intervalId = window.setInterval(() => void loadWeather(), 20 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  if (!now) return <div style={{ height: 48 }} aria-hidden="true" />;

  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const condition =
    weather?.code != null
      ? WEATHER_LABELS[weather.code] ?? "Current conditions"
      : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 26,
        flexWrap: "wrap",
      }}
      aria-label="Local time and weather"
    >
      <div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 300,
            letterSpacing: "0.04em",
            color: "#f0ede8",
            lineHeight: 1,
            textShadow: `0 0 22px ${ACCENT}33`,
          }}
        >
          {time}
        </div>
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: "0.2em",
            color: "rgba(240,237,232,0.55)",
            marginTop: 4,
            textTransform: "uppercase",
          }}
        >
          {date}
        </div>
      </div>

      {weather && (
        <div aria-live="polite">
          <div
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: `${ACCENT}e6`,
            }}
          >
            {weather.temp != null ? `${Math.round(weather.temp)}°C` : "—"}
          </div>
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: "0.12em",
              color: "rgba(240,237,232,0.5)",
              marginTop: 2,
              textTransform: "uppercase",
            }}
          >
            {weather.city.toUpperCase()}
            {condition ? ` · ${condition.toUpperCase()}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApexOverviewPanel() {
  const [open, setOpen] = useState(false);
  const filamentWidth = open ? 480 : 320;
  const panelId = "apex-overview-links";
  const filamentCap = "calc(100vw - 184px)";

  const tileStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "11px 14px",
    background: "rgba(6,14,26,0.72)",
    border: `1px solid ${ACCENT}2a`,
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
    backdropFilter: "blur(8px)",
    transition: "background .2s ease, border-color .2s ease",
    color: "rgba(240,237,232,0.9)",
    textDecoration: "none",
    width: "100%",
  };

  return (
    <div className="apex-overview" style={{ pointerEvents: "none" }}>
      {/* Downward glow cone */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 14,
          left: 8,
          width: "min(520px, 94vw)",
          height: 240,
          pointerEvents: "none",
          background: `radial-gradient(ellipse 48% 70% at 46% 0%, ${ACCENT}${open ? "55" : "28"}, ${ACCENT}0a 46%, transparent 72%)`,
          filter: "blur(10px)",
          transition: "all .5s ease",
        }}
      />

      {/* Filament line, sliding node, and accessible toggle */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close overview panel" : "Open overview panel"}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          height: 40,
          padding: 0,
          border: 0,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          pointerEvents: "auto",
          userSelect: "none",
          textAlign: "left",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 14,
            left: 8,
            width: `min(${filamentWidth}px, ${filamentCap})`,
            height: 2,
            borderRadius: 2,
            background: "#f7e3b5",
            boxShadow: `0 0 10px ${ACCENT}, 0 0 26px ${ACCENT}${open ? ", 0 0 54px " + ACCENT : ""}`,
            transition: "all .5s ease",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 11,
            left: open ? `min(${filamentWidth}px, ${filamentCap})` : 6,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#fff6e0",
            boxShadow: `0 0 10px ${ACCENT}, 0 0 18px ${ACCENT}`,
            transition: "left .5s ease",
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 20,
            left: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.34em",
            color: `rgba(165,243,252,${open ? 0.9 : 0.55})`,
            transition: "color .4s",
          }}
        >
          OVERVIEW
        </span>
      </button>

      {/* Clock and visitor-local weather */}
      <div
        style={{
          paddingLeft: 14,
          paddingTop: 6,
          width: "fit-content",
          pointerEvents: "auto",
        }}
      >
        <Clock />

        {open && (
          <nav
            id={panelId}
            aria-label="NEAS social profiles"
            style={{
              marginTop: 16,
              width: 250,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {TILES.map(({ key, icon: Icon, label, href }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} (opens in a new tab)`}
                style={tileStyle}
              >
                <span style={{ display: "flex", color: ACCENT }} aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 11.5,
                    letterSpacing: "0.05em",
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </span>
                <ArrowUpRight
                  size={12}
                  aria-hidden="true"
                  style={{ color: `${ACCENT}88`, flex: "none" }}
                />
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
