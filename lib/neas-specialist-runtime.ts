/**
 * NEAS APEX specialist runtime registry.
 * This is deterministic routing metadata, not proof of a configured model or live agent.
 */
export const NEAS_RUNTIME_SPECIALISTS = {
  engineering: { label: "NEAS Engineering Agent", guidance: "Handle technical engineering, inspection evidence, calculations, design interfaces, standards verification, and competent-person review. Never certify designs or safety-critical work." },
  "project-management": { label: "NEAS Project Management Agent", guidance: "Handle scope, work breakdown, schedule, manpower, resources, dependencies, progress, risk registers, and project reporting. Treat dates and forecasts as estimates unless confirmed." },
  safety: { label: "NEAS HSEQ & Safety Agent", guidance: "Handle hazard identification, risk assessment, JSA/JHA, permits, rescue readiness, work-at-height controls, and audit preparation. Never authorize site work or approve safety-critical controls." },
  commercial: { label: "NEAS Commercial & Finance Agent", guidance: "Handle BOQ, estimates, costing, pricing assumptions, cash flow, payment terms, margin analysis, procurement economics, and contract risk. All quotations and financial commitments require human approval." },
  "renewable-energy": { label: "NEAS Renewable Energy Agent", guidance: "Handle wind, solar, met mast, turbine blades, offshore/onshore renewables, inspections, maintenance, LIDAR, and project feasibility. Identify engineering review and evidence gaps." },
  "business-development": { label: "NEAS Business Development Agent", guidance: "Handle lead qualification, tender intelligence, client needs, partnerships, pipeline strategy, proposal drafting, and follow-up planning. Never claim outreach or commitments occurred unless confirmed." },
  marketing: { label: "NEAS Marketing & SEO Agent", guidance: "Handle SEO, website conversion, content strategy, keyword research, brand positioning, social media drafts, and analytics. Publishing, advertising, and external communications require approval." },
  procurement: { label: "NEAS Procurement Agent", guidance: "Handle material specifications, supplier comparisons, sourcing plans, inventory analysis, delivery risks, and procurement documentation. Purchases, purchase orders, and supplier commitments require approval." },
  training: { label: "NEAS Training & Competency Agent", guidance: "Handle GWO/IRATA training administration, course plans, learning materials, training schedules, and competency matrix drafts. Never issue, validate, or represent a certification or qualification." },
  "legal-compliance": { label: "NEAS Legal & Compliance Agent", guidance: "Provide contract and regulatory issue spotting, compliance checklists, clause summaries, and escalation points. This is not legal advice; qualified counsel must review legal conclusions and contract decisions." },
  "data-intelligence": { label: "NEAS Data Intelligence Agent", guidance: "Analyze only authorized internal datasets, KPIs, dashboards, trends, and forecasts. State source coverage, data quality, assumptions, and limitations; never invent metrics." },
  executive: { label: "NEAS Executive Agent", guidance: "Provide CEO decision support, strategy, corporate performance analysis, enterprise risk, and growth recommendations. Recommendations do not replace the authorized executive's decision." },
} as const;

export type NeasRuntimeSpecialistId = keyof typeof NEAS_RUNTIME_SPECIALISTS;

export function routeNeasRuntimeSpecialist(text: string): NeasRuntimeSpecialistId {
  const value = text.toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => value.includes(term));
  if (has("risk assessment", "jsa", "jha", "method statement", "permit to work", "work at height", "confined space", "hse", "hseq", "safety", "rescue plan")) return "safety";
  if (has("rope access", "irata", "rigging", "anchor point", "anchor bolt", "suspended access", "rope rescue", "ndt", "welding", "inspection", "engineering")) return "engineering";
  if (has("wind turbine", "wind farm", "solar", "renewable", "met mast", "blade inspection", "blade repair", "lidar", "photovoltaic", "offshore", "onshore")) return "renewable-energy";
  if (has("boq", "quotation", "quote", "pricing", "costing", "budget", "invoice", "payment terms", "cash flow", "margin", "vat", "billing", "financial")) return "commercial";
  if (has("procurement", "supplier", "vendor", "purchase order", "inventory", "stock", "material specification", "delivery")) return "procurement";
  if (has("training", "gwo", "irata course", "competency", "assessment", "certification", "course", "trainee", "instructor")) return "training";
  if (has("legal", "contract", "agreement", "clause", "liability", "compliance", "regulatory", "claim", "dispute", "indemnity")) return "legal-compliance";
  if (has("seo", "marketing", "website", "search engine", "content", "social media", "campaign", "conversion", "brand", "keyword")) return "marketing";
  if (has("data", "dashboard", "analytics", "kpi", "performance metrics", "trend", "database", "reporting", "forecast")) return "data-intelligence";
  if (has("schedule", "project plan", "milestone", "progress", "resource plan", "work breakdown", "wbs", "project status", "manpower")) return "project-management";
  if (has("proposal", "lead", "client", "sales", "business development", "opportunity", "follow up", "tender", "partnership")) return "business-development";
  if (has("ceo", "executive", "strategy", "strategic", "corporate", "growth", "company direction", "business plan")) return "executive";
  return "engineering";
}
