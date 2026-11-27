"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

type Signal = {
  id: string;
  title: string;
  source_url: string;
  source_name: string;
  industry: string;
  signal_type: string;
  published_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  seen_count: number;
  discovery_score: number;
  evidence_excerpt: string;
  verification_status: string;
  lead_status: string;
  publication_status: string;
  publication_reason: string;
};

const industries = [
  "energy", "construction", "manufacturing", "agriculture", "tourism",
  "transport-logistics", "technology", "finance-commerce", "healthcare",
  "education", "government", "environment",
];

const gold = "#EBC07E";
const muted = "#b7aa97";
const panel: CSSProperties = {
  background: "rgba(255,255,255,.035)",
  border: "1px solid rgba(235,192,126,.16)",
  borderRadius: 16,
  padding: 18,
};

function pretty(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CommercialIntelligencePage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [industry, setIndustry] = useState("all");
  const [minimumScore, setMinimumScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/giie/commercial-signals?limit=100", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Sign in to NEAS APEX as an authorized administrator to view commercial signals.");
        }
        throw new Error("Commercial intelligence data is not available. Check the migration and server configuration.");
      }
      const data = await response.json() as { signals?: Signal[] };
      setSignals(Array.isArray(data.signals) ? data.signals : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load commercial intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => signals.filter((signal) =>
    (industry === "all" || signal.industry === industry) && signal.discovery_score >= minimumScore
  ), [signals, industry, minimumScore]);

  const highPriority = filtered.filter((signal) => signal.discovery_score >= 75).length;
  const procurement = filtered.filter((signal) =>
    signal.signal_type === "tender-procurement" || signal.signal_type === "contract-award"
  ).length;

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 15% 0%,rgba(202,147,50,.12),transparent 36%),#090807", color: "#f0ede8", padding: "clamp(18px,4vw,52px)", fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <nav style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 26 }}>
          <a href="/market-intelligence" style={{ color: gold, textDecoration: "none", fontSize: 12 }}>← Market Intelligence</a>
          <button onClick={() => void refresh()} disabled={loading} style={{ background: "transparent", border: "1px solid rgba(235,192,126,.3)", color: gold, borderRadius: 9, padding: "9px 13px", cursor: "pointer" }}>
            {loading ? "Refreshing…" : "Refresh signals"}
          </button>
        </nav>

        <header style={{ marginBottom: 26 }}>
          <div style={{ color: gold, fontSize: 11, letterSpacing: ".22em", fontWeight: 800 }}>NEAS APEX · GIIE · COMMERCIAL INTELLIGENCE</div>
          <h1 style={{ fontSize: "clamp(30px,5vw,56px)", lineHeight: 1.03, margin: "12px 0", letterSpacing: "-.04em" }}>Philippines Opportunity Radar</h1>
          <p style={{ color: muted, fontSize: 14, lineHeight: 1.7, maxWidth: 850, margin: 0 }}>
            Hourly discovery across twelve industries. Rank public project, procurement, investment, expansion, maintenance and workforce signals for commercial research.
          </p>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 18 }}>
          {[
            [String(filtered.length), "Research leads"],
            [String(highPriority), "Priority score 75+"],
            [String(procurement), "Tender / award signals"],
            [String(filtered.filter((signal) => signal.seen_count > 1).length), "Recurring signals"],
          ].map(([value, label]) => <div key={label} style={panel}>
            <div style={{ fontSize: 28, color: gold, fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 5 }}>{label}</div>
          </div>)}
        </section>

        <section style={{ ...panel, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "grid", gap: 6, fontSize: 11, color: muted }}>
              Industry
              <select value={industry} onChange={(event) => setIndustry(event.target.value)} style={{ minWidth: 210, minHeight: 40, borderRadius: 9, padding: "0 10px", background: "#11100e", color: "#f0ede8", border: "1px solid rgba(235,192,126,.25)" }}>
                <option value="all">All industries</option>
                {industries.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 11, color: muted }}>
              Minimum priority: {minimumScore}
              <input type="range" min="0" max="100" step="5" value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} />
            </label>
            <div style={{ marginLeft: "auto", color: muted, fontSize: 11 }}>{filtered.length} matching signals</div>
          </div>
        </section>

        {error && <div role="alert" style={{ ...panel, borderColor: "rgba(255,120,100,.4)", color: "#ffb7a8", marginBottom: 16 }}>{error}</div>}
        {loading && <div style={panel}>Loading commercial signals…</div>}
        {!loading && !error && filtered.length === 0 && <div style={panel}>No commercial signals found yet. Confirm the hourly collector workflow, Brave Search credentials, and Supabase migration.</div>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 12 }}>
          {filtered.map((signal) => <article key={signal.id} style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div style={{ color: gold, fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>{pretty(signal.industry)} · {pretty(signal.signal_type)}</div>
              <div aria-label={"Priority score " + signal.discovery_score} style={{ border: "1px solid rgba(235,192,126,.3)", borderRadius: 9, padding: "5px 8px", color: gold, fontWeight: 800, fontSize: 15 }}>{signal.discovery_score}</div>
            </div>
            <h2 style={{ fontSize: 17, lineHeight: 1.35, margin: "12px 0 7px" }}>{signal.title}</h2>
            <p style={{ color: muted, fontSize: 12, lineHeight: 1.6, margin: "0 0 12px" }}>{signal.evidence_excerpt || "No excerpt supplied by search provider."}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {[signal.verification_status, signal.lead_status, signal.publication_status].map((value) => <span key={value} style={{ fontSize: 10, color: muted, border: "1px solid rgba(235,192,126,.18)", borderRadius: 20, padding: "4px 7px" }}>{pretty(value)}</span>)}
            </div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 9 }}>{signal.source_name} · Seen {signal.seen_count} time(s)</div>
            <a href={signal.source_url} target="_blank" rel="noreferrer" style={{ color: gold, fontSize: 12, textDecoration: "none" }}>Open original source ↗</a>
          </article>)}
        </section>

        <footer style={{ marginTop: 24, color: muted, fontSize: 11, lineHeight: 1.7 }}>
          Priority scores are research-triage heuristics, not verified project values, revenue forecasts, or win probabilities. Search results remain unverified until reviewed. Automatic public publishing is blocked unless evidence, corroboration, citations and content-type gates pass.
        </footer>
      </div>
    </main>
  );
}
