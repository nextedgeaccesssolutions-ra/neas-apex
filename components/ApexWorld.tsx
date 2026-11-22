"use client";

/**
 * ApexWorld - the Apex app's CURRENT main screen, replicated for the site.
 * Layers: app-blue backdrop → clickable orb core (ring + particles, same tap
 * cycle) → ReasoningWeb (verbatim copy from the app: circuit traces, orbit
 * rings, the full asymmetric roster, ambient motes) → OrbStatusBar (equalizer
 * + STANDBY cluster at the bottom).
 * Clicking any node opens the site's AGENT OVERVIEW window template; the
 * orb's tap cycle drives the whole web (standby → processing → speaking).
 */

import { useEffect, useRef, useState } from "react";
import ApexHeroOrb, { type OrbState } from "./ApexHeroOrb";
import ReasoningWebJs from "./ReasoningWeb";
import ShaderBackgroundJs from "./ShaderBackground";
import OrbStatusBar from "./OrbStatusBar";

export type NodeSel = { name: string; key: string; color: string };

// the copied .jsx defaults onSelect to null, which TS infers as `null | undefined`
const ReasoningWeb = ReasoningWebJs as unknown as React.ComponentType<{
  state?: string; trace?: unknown; mode?: string; coreless?: boolean;
  onSelect?: (n: NodeSel) => void; light?: boolean;
}>;
const ShaderBackground = ShaderBackgroundJs as unknown as React.ComponentType<{
  opacity?: number; voiceActive?: boolean; gold?: boolean;
}>;
type AgentInfo = {
  role: string;
  caps: string[];
  asks?: string[];
  status: "online" | "standby" | "integration";
};

/* Mirrors the ROSTER in ReasoningWeb.jsx (a verbatim copy from the Apex app, so
   it is not edited here). Backs the visually-hidden agent list that gives the
   decorative SVG graph a keyboard and screen-reader equivalent - keep in sync if
   the copy's roster changes. */
export const ROSTER: { key: string; name: string; color: string }[] = [
  { key: "ceo",          name: "CEO",          color: "#f0cd89" },
  { key: "caio",         name: "CAIO",         color: "#f0cd89" },
  { key: "hseq",         name: "HSEQ",         color: "#f0cd89" },
  { key: "engineering",  name: "Engineering",  color: "#f0cd89" },
  { key: "finance",      name: "Finance",      color: "#f0cd89" },
  { key: "compliance",   name: "Compliance",   color: "#f0cd89" },
  { key: "rope_access",  name: "Rope Access",  color: "#d4a64f" },
  { key: "renewables",   name: "Renewables",   color: "#d4a64f" },
  { key: "offshore",     name: "Offshore",     color: "#d4a64f" },
  { key: "projects",     name: "Projects",     color: "#d4a64f" },
  { key: "sales",        name: "Sales",        color: "#d4a64f" },
  { key: "marketing",    name: "Marketing",    color: "#d4a64f" },
  { key: "training",     name: "Training",     color: "#d4a64f" },
  { key: "gmail",        name: "Gmail",        color: "#8a8172" },
  { key: "supabase",     name: "Supabase",     color: "#8a8172" },
  { key: "drive",        name: "Drive",        color: "#8a8172" },
  { key: "calendar",     name: "Calendar",     color: "#8a8172" },
  { key: "crm",          name: "CRM",          color: "#8a8172" },
];

/* Overview data per ReasoningWeb roster id - the site's template content */
export const INFO: Record<string, AgentInfo> = {
  ceo: { role: "Executive direction", status: "online",
    caps: ["Company-wide strategy and governance", "Executive KPI review across all nine departments", "Escalates decisions reserved for the company owner"],
    asks: ["Where should we focus this quarter?", "Summarise this week"] },
  caio: { role: "AI orchestration", status: "online",
    caps: ["Routes work to the right specialist role", "Keeps the workforce inside its approval gates", "Owns model routing and fallback"],
    asks: ["Who should handle this?", "What is queued right now?"] },
  hseq: { role: "Safety, health, environment, quality", status: "online",
    caps: ["Hazard identification and risk assessment", "Method statement and permit-to-work review", "Incident investigation and corrective actions"],
    asks: ["Review this method statement", "Draft a risk assessment"] },
  engineering: { role: "Technical authority", status: "online",
    caps: ["Technical scope and specification review", "Wind turbine, met mast and telecom tower work", "NDT and structural inspection planning"],
    asks: ["Review this scope", "What standard applies here?"] },
  finance: { role: "Commercial control", status: "online",
    caps: ["Cost and margin analysis on every job", "Cash-flow forecasting", "Quote and tender pricing sanity checks"],
    asks: ["Is this priced right?", "How did this month close?"] },
  compliance: { role: "Certification and competency", status: "online",
    caps: ["IRATA and GWO certification tracking", "Technician competency records", "Audit readiness and document control"],
    asks: ["Who is certified for this job?", "What expires next month?"] },
  rope_access: { role: "Rope access delivery", status: "online",
    caps: ["IRATA-compliant work planning", "Rescue plans and team composition", "Access method selection"],
    asks: ["Plan access for this structure", "Draft the rescue plan"] },
  renewables: { role: "Wind and solar", status: "online",
    caps: ["Blade inspection and repair scoping", "Turbine and met mast campaigns", "GWO-compliant crew planning"],
    asks: ["Scope a blade campaign", "What crew do we need?"] },
  offshore: { role: "Offshore, onshore and power", status: "online",
    caps: ["Offshore mobilisation planning", "Power and transmission structure work", "Marine and logistics coordination"],
    asks: ["Plan this mobilisation", "What permits apply offshore?"] },
  projects: { role: "Operations", status: "online",
    caps: ["Project planning and scheduling", "Workforce deployment and equipment", "Procurement and logistics"],
    asks: ["Build the schedule", "Who is available that week?"] },
  sales: { role: "Business development", status: "online",
    caps: ["Lead qualification and scoring", "Proposals and tender responses", "Follow-ups so nothing goes cold"],
    asks: ["Draft a follow-up", "Which leads went quiet?"] },
  marketing: { role: "Global expansion", status: "online",
    caps: ["SEO and content for the NEAS site", "Market and competitor research", "Campaign planning across regions"],
    asks: ["Research this market", "Plan the content week"] },
  training: { role: "Human capital", status: "online",
    caps: ["Training programme coordination", "Recruitment workflow support", "Learning and development tracking"],
    asks: ["Who needs recertification?", "Plan the next course"] },
  gmail: { role: "Mailboxes", status: "integration",
    caps: ["Reads metadata for the info and operations mailboxes", "Drafts replies for human review before sending"] },
  supabase: { role: "Workforce database", status: "integration",
    caps: ["Agent directory, work queue and approvals", "Governance audit trail"] },
  drive: { role: "Document store", status: "integration",
    caps: ["Method statements, certificates and reports", "Shared project documentation"] },
  calendar: { role: "Schedule", status: "integration",
    caps: ["Mobilisation dates and crew availability", "Training and recertification deadlines"] },
  crm: { role: "Client pipeline", status: "integration",
    caps: ["Every lead and client in one pipeline", "Stage tracking from enquiry to paid"] },
};

const STATUS_LINE: Record<AgentInfo["status"], { color: string; text: string }> = {
  online: { color: "#34d399", text: "Online - Apex routes work to it automatically" },
  standby: { color: "#c9a84c", text: "Standby - in active development" },
  integration: { color: "#8a8172", text: "Integration - wired into the core" },
};

/* ── AGENT OVERVIEW window - the site's template (the app opens live cockpits) ── */
export function AgentOverview({ sel, onClose }: { sel: NodeSel; onClose: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number } | null>(null);
  const info = INFO[sel.key] ?? { role: "Specialist", status: "online" as const, caps: ["Part of the Apex core"] };
  const c = sel.color;
  const status = STATUS_LINE[info.status];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPos({ x: Math.max(8, window.innerWidth / 2 - 170), y: Math.max(90, window.innerHeight * 0.16) });
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Move focus into the window when it opens and hand it back on close, so the
  // keyboard does not stay stranded on the agent list behind it.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pos) return;
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { if (opener && document.contains(opener)) opener.focus(); };
  }, [pos]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!pos) return;
    dragRef.current = { sx: e.clientX - pos.x, sy: e.clientY - pos.y };
    const move = (ev: MouseEvent) => {
      if (dragRef.current) setPos({ x: ev.clientX - dragRef.current.sx, y: ev.clientY - dragRef.current.sy });
    };
    const up = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  if (!pos) return null;
  return (
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`${sel.name} overview`} style={{
      position: "fixed", left: pos.x, top: pos.y,
      width: "min(340px, 92vw)", zIndex: 60,
      background: "rgba(4,3,12,0.92)",
      backdropFilter: "blur(24px)",
      border: `1px solid ${c}44`,
      borderRadius: 16,
      boxShadow: `0 0 40px ${c}18, 0 8px 32px rgba(0,0,0,0.6)`,
      overflow: "hidden",
    }}>
      {/* header - drag handle */}
      <div onMouseDown={onMouseDown} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
        borderBottom: `1px solid ${c}22`, cursor: "grab", userSelect: "none",
        background: `linear-gradient(135deg, ${c}0a 0%, transparent 100%)`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: `${c}14`,
          border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}` }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: c }}>{sel.name.toUpperCase()}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{info.role}</div>
        </div>
        <button onClick={onClose} aria-label="Close"
          style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "6px 8px", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >×</button>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", color: `${c}99`, marginBottom: 8, fontFamily: "var(--font-mono)" }}>WHAT IT HANDLES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {info.caps.map((cap) => (
              <div key={cap} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: `${c}99`, marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {info.asks && info.asks.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.14em", color: `${c}99`, marginBottom: 8, fontFamily: "var(--font-mono)" }}>EXAMPLE REQUESTS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {info.asks.map((task) => (
                <span key={task} style={{
                  padding: "4px 10px", background: `${c}0d`, border: `1px solid ${c}2a`,
                  borderRadius: 20, fontSize: 10.5, color: `${c}cc`,
                }}>{task}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 7, borderTop: `1px solid ${c}1a`, paddingTop: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
          <span style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>{status.text}</span>
        </div>
      </div>
    </div>
  );
}

/* ── The world ── */
export default function ApexWorld() {
  const [selected, setSelected] = useState<NodeSel | null>(null);
  const [reduced, setReduced] = useState(false);

  // A tap cycles idle → thinking → speaking → idle. That state drives the
  // backdrop, the light-cast and the reasoning web's activity level.
  const [showState, setShowState] = useState<OrbState>("idle");
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbState: OrbState = showState;

  const boost = () => {
    const next: OrbState = showState === "idle" ? "thinking" : showState === "thinking" ? "speaking" : "idle";
    setShowState(next);
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => setShowState("idle"), 8000);
  };
  useEffect(() => () => { if (showTimer.current) clearTimeout(showTimer.current); }, []);

  // Single entry point for opening an agent, shared by the SVG graph and the
  // hidden accessible list, so both routes behave identically.
  const openAgent = (n: NodeSel) => {
    setSelected(n);
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // orb tap cycle → the web's activity level (same states the app streams)
  const webState = orbState === "thinking" ? "processing" : orbState === "speaking" ? "speaking" : "standby";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", userSelect: "none" }}>
      {/* backdrop - the app's EXACT stack (Chat.jsx dark mode): base radial page
          gradient, waves at 0.12, the cyan breathing glow behind the orb, and the
          dark moat disc directly behind the particle cloud that makes it pop. */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 95% 88% at 50% 42%, #2c2315 0%, #1d1810 38%, #121009 72%, #090807 100%)",
      }} />

      {/* background waves - the app's WebGL shader at the app's opacity */}
      {!reduced && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <ShaderBackground opacity={0.14} voiceActive={orbState === "speaking"} gold={true} />
        </div>
      )}

      {/* cyan LIGHT-CAST - app copy exactly: mixBlendMode screen (only ever LIFTS the
          navy, never darkens), brightens while speaking. The app has NO dark moat disc
          in dark mode - that layer is its light-theme "reactor well" only. */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", mixBlendMode: "screen",
        background: `radial-gradient(circle at 50% 42%, rgba(240,205,137,${orbState === "speaking" ? 0.30 : 0.18}) 0%, rgba(212,166,79,0.08) 30%, rgba(31,24,8,0) 62%)`,
        transition: "background 0.6s ease",
      }} />

      {/* the reasoning web - app z-order: web (z13) sits BELOW the orb canvas (z15),
          so the bloom haze washes over the lines near the centre, exactly like the app */}
      {/* ReasoningWeb is a verbatim copy from the Apex app: its 18 agent nodes are
          imperative SVG hit-areas with no tabindex, inside an svg[role=img] that
          collapses the whole graph into a single image. Rather than edit the copy,
          the graph is marked decorative here and the same onSelect path is exposed
          through the equivalent list of real buttons below. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
        <ReasoningWeb
          state={webState}
          mode="full"
          coreless
          onSelect={(n: NodeSel) => { openAgent(n); }}
        />
      </div>

      {/* Keyboard and screen-reader equivalent of the agent graph. */}
      <nav className="visually-hidden" aria-label="Apex agents">
        <ul>
          {ROSTER.map((a) => (
            <li key={a.key}>
              <button type="button" onClick={() => openAgent({ key: a.key, name: a.name, color: a.color })}>
                {a.name} - {INFO[a.key]?.role ?? "Specialist"}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* the core - painted ABOVE the web (app order); display-only, the tap target
          is the circular disc below so agent nodes near the ring stay clickable */}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: "min(560px, 58vw)", height: "min(500px, 56vw, 70vh)", transform: "translate(-50%, -50%)", zIndex: 3, pointerEvents: "none" }}>
        <ApexHeroOrb state={orbState} interactive={false} />
      </div>

      {/* central tap disc - covers the ring only (nodes orbit outside it) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Apex core - tap to energize"
        onClick={boost}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boost(); } }}
        onMouseDown={(e) => e.preventDefault()}
        style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: "min(340px, 36vw)", height: "min(340px, 36vw)", borderRadius: "50%",
          zIndex: 4, cursor: "pointer", background: "transparent", border: "none", userSelect: "none",
        }}
      />

      {/* equalizer + STANDBY cluster */}
      <OrbStatusBar state={orbState} />

      {selected && <AgentOverview sel={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
