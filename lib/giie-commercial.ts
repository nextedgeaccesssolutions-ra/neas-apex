import { createHash } from "node:crypto";
import type { GiieSearchResult } from "./giie-connectors";

export type CommercialSignalType =
  | "tender-procurement"
  | "contract-award"
  | "project-investment"
  | "asset-maintenance"
  | "business-expansion"
  | "workforce-demand"
  | "market-demand"
  | "general-commercial";

export type CommercialTopicGroup = {
  id: string;
  label: string;
  industry: string;
  queries: readonly [string, string];
};

export type CommercialSignal = {
  signal_key: string;
  title: string;
  source_url: string;
  source_name: string;
  source_provider: "brave-search";
  industry: string;
  signal_type: CommercialSignalType;
  geography: string[];
  published_at: string | null;
  discovered_at: string;
  last_seen_at: string;
  seen_count: number;
  discovery_score: number;
  score_method: "commercial_opportunity_priority_v1";
  score_basis: Record<string, unknown>;
  evidence_excerpt: string;
  verification_status: "unverified";
  lead_status: "new";
  publication_status: "blocked_unverified";
  publication_reason: string;
};

const COMMERCIAL_TERMS = /\b(tender|procurement|invitation to bid|request for proposal|rfp|bid notice|notice of award|contract award|contract|project|investment|capex|expansion|facility|plant|construction|development|supplier|vendor|maintenance|outage|shutdown|asset integrity|inspection|hiring|workforce)\b/i;
const TENDER_TERMS = /\b(tender|procurement|invitation to bid|request for proposal|rfp|bid notice|philgeps|notice of award|bidding)\b/i;
const AWARD_TERMS = /\b(notice of award|awarded|contract award|wins contract|awarded contract|winning bidder)\b/i;
const PROJECT_TERMS = /\b(project|investment|capex|feasibility|development|construction|plant|facility|megawatt|mw\b|billion|million|expansion|new terminal|new factory)\b/i;
const MAINTENANCE_TERMS = /\b(maintenance|outage|shutdown|inspection|asset integrity|repair|rehabilitation|retrofit|coating|blade repair|tower maintenance)\b/i;
const EXPANSION_TERMS = /\b(expansion|expands|new facility|new plant|new factory|capacity increase|groundbreaking|breaks ground|construction begins)\b/i;
const WORKFORCE_TERMS = /\b(hiring|recruitment|workforce|manpower|technician|engineer|training demand|job opening)\b/i;
const PH_TERMS = /\b(philippines|philippine|manila|cebu|davao|luzon|visayas|mindanao|philippine peso|php)\b/i;
const NEAS_FIT_TERMS = /\b(rope access|working at height|wind turbine|offshore wind|onshore wind|solar|power plant|substation|met mast|telecom tower|ndt|non-destructive testing|inspection|asset integrity|corrosion|coating|facade|industrial maintenance|confined space|training)\b/i;
const OFFICIAL_HOSTS = [
  "gov.ph", "philgeps.gov.ph", "doe.gov.ph", "dpwh.gov.ph", "dotr.gov.ph",
  "erc.gov.ph", "ngcp.ph", "ppp.gov.ph", "sec.gov.ph", "psa.gov.ph",
];

export const COMMERCIAL_TOPIC_GROUPS: readonly CommercialTopicGroup[] = [
  { id: "energy-utilities", label: "Energy and utilities", industry: "energy", queries: [
    "Philippines renewable energy power generation project investment procurement tender EPC contract",
    "Philippines power plant utility operations maintenance outage contract investment expansion",
  ] },
  { id: "construction-infrastructure", label: "Construction and infrastructure", industry: "construction", queries: [
    "Philippines infrastructure construction project tender PPP procurement contract",
    "Philippines commercial industrial building facility development expansion capex project",
  ] },
  { id: "manufacturing-mining", label: "Manufacturing and mining", industry: "manufacturing", queries: [
    "Philippines manufacturing factory investment expansion industrial plant procurement",
    "Philippines industrial maintenance shutdown outage service contract supplier tender",
  ] },
  { id: "agriculture-fisheries", label: "Agriculture and fisheries", industry: "agriculture", queries: [
    "Philippines agriculture food processing investment facility expansion procurement",
    "Philippines agribusiness fisheries aquaculture project tender supplier contract",
  ] },
  { id: "tourism-hospitality", label: "Tourism and hospitality", industry: "tourism", queries: [
    "Philippines hotel resort tourism development investment project procurement",
    "Philippines hospitality facility expansion construction maintenance contract tender",
  ] },
  { id: "transport-logistics", label: "Transport and logistics", industry: "transport-logistics", queries: [
    "Philippines port airport railway logistics infrastructure investment procurement project",
    "Philippines shipping maritime terminal fleet maintenance service contract tender",
  ] },
  { id: "technology-telecom", label: "Technology and telecommunications", industry: "technology", queries: [
    "Philippines data center telecom fiber infrastructure investment expansion project",
    "Philippines AI IT infrastructure cybersecurity telecom procurement tender contract",
  ] },
  { id: "finance-commerce", label: "Finance and commerce", industry: "finance-commerce", queries: [
    "Philippines bank fintech payments ecommerce retail expansion investment acquisition",
    "Philippines commercial property mall retail facility expansion supplier procurement",
  ] },
  { id: "healthcare-pharma", label: "Healthcare and pharmaceuticals", industry: "healthcare", queries: [
    "Philippines hospital healthcare facility expansion investment procurement project",
    "Philippines medical equipment pharmaceutical supplier tender contract manufacturing",
  ] },
  { id: "education-workforce", label: "Education and workforce", industry: "education", queries: [
    "Philippines university school campus expansion construction procurement project",
    "Philippines technical training workforce development manpower service contract tender",
  ] },
  { id: "government-procurement", label: "Government and procurement", industry: "government", queries: [
    "Philippines government procurement bid notice PhilGEPS invitation to bid contract",
    "Philippines public private partnership project notice of award government tender",
  ] },
  { id: "environment-climate", label: "Environment and climate", industry: "environment", queries: [
    "Philippines waste water climate resilience renewable infrastructure project tender",
    "Philippines environmental infrastructure investment service contract procurement project",
  ] },
] as const;

const INDUSTRY_TERMS: ReadonlyArray<{ industry: string; terms: readonly string[] }> = [
  { industry: "energy", terms: ["energy", "power", "solar", "wind", "turbine", "electricity", "offshore", "renewable", "grid", "geothermal", "hydro"] },
  { industry: "construction", terms: ["construction", "building", "infrastructure", "bridge", "road", "rail", "real estate", "property", "housing"] },
  { industry: "manufacturing", terms: ["manufacturing", "factory", "industrial", "mining", "cement", "steel", "semiconductor", "electronics", "production"] },
  { industry: "agriculture", terms: ["agriculture", "farming", "farm", "fisheries", "fishery", "aquaculture", "food", "rice", "coconut", "livestock"] },
  { industry: "tourism", terms: ["tourism", "hotel", "hospitality", "travel", "resort", "airport", "destination"] },
  { industry: "transport-logistics", terms: ["transport", "logistics", "shipping", "port", "maritime", "freight", "aviation", "railway", "supply chain"] },
  { industry: "technology", terms: ["technology", "artificial intelligence", "data center", "telecom", "telecommunications", "software", "cybersecurity", "cloud", "digital"] },
  { industry: "finance-commerce", terms: ["bank", "finance", "fintech", "e-commerce", "ecommerce", "retail", "trade", "shopping", "consumer", "payment"] },
  { industry: "healthcare", terms: ["health", "hospital", "medical", "pharma", "pharmaceutical", "clinic", "medicine", "biotech"] },
  { industry: "education", terms: ["education", "school", "university", "training", "employment", "workforce", "skills", "labor"] },
  { industry: "government", terms: ["government", "tender", "procurement", "department of energy", "doe", "dpwh", "dotr", "contract", "bidding", "philgeps"] },
  { industry: "environment", terms: ["climate", "environment", "disaster", "flood", "water", "waste", "resilience", "sustainability", "pollution"] },
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getHourlyCommercialTopicGroup(now = new Date()): CommercialTopicGroup {
  const hour = Math.floor(now.getTime() / 3_600_000);
  const index = ((hour % COMMERCIAL_TOPIC_GROUPS.length) + COMMERCIAL_TOPIC_GROUPS.length) % COMMERCIAL_TOPIC_GROUPS.length;
  return COMMERCIAL_TOPIC_GROUPS[index];
}

export function classifyCommercialIndustry(value: string, fallback = "general-business"): string {
  const normalized = " " + normalizeText(value) + " ";
  for (const item of INDUSTRY_TERMS) {
    if (item.terms.some((term) => normalized.includes(" " + normalizeText(term) + " "))) return item.industry;
  }
  return fallback;
}

export function classifyCommercialSignal(value: string): CommercialSignalType {
  if (AWARD_TERMS.test(value)) return "contract-award";
  if (TENDER_TERMS.test(value)) return "tender-procurement";
  if (MAINTENANCE_TERMS.test(value)) return "asset-maintenance";
  if (EXPANSION_TERMS.test(value)) return "business-expansion";
  if (WORKFORCE_TERMS.test(value)) return "workforce-demand";
  if (PROJECT_TERMS.test(value)) return "project-investment";
  if (COMMERCIAL_TERMS.test(value)) return "market-demand";
  return "general-commercial";
}

function parsePublishedAt(value?: string): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function isOfficialHost(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
    return OFFICIAL_HOSTS.some((host) => hostname === host || hostname.endsWith("." + host));
  } catch {
    return false;
  }
}

export function scoreCommercialSignal(
  result: Pick<GiieSearchResult, "title" | "description" | "url" | "publishedAt">,
  now = new Date(),
): { score: number; signalType: CommercialSignalType; basis: Record<string, unknown> } {
  const text = result.title + " " + result.description;
  const signalType = classifyCommercialSignal(text);
  const published = parsePublishedAt(result.publishedAt);
  const ageDays = published ? Math.max(0, (now.getTime() - Date.parse(published)) / 86_400_000) : null;
  const commercialPoints: Record<CommercialSignalType, number> = {
    "contract-award": 35,
    "tender-procurement": 35,
    "project-investment": 30,
    "asset-maintenance": 28,
    "business-expansion": 26,
    "workforce-demand": 18,
    "market-demand": 14,
    "general-commercial": 5,
  };
  const commercialIntent = commercialPoints[signalType];
  const philippinesRelevance = PH_TERMS.test(text) ? 15 : 0;
  const projectSpecificity = PROJECT_TERMS.test(text) ? 15 : 0;
  const sourceAuthority = isOfficialHost(result.url) ? 15 : 0;
  const freshness = ageDays === null ? 0 : ageDays <= 7 ? 10 : ageDays <= 30 ? 6 : ageDays <= 90 ? 2 : 0;
  const neasServiceFit = NEAS_FIT_TERMS.test(text) ? 10 : 0;
  const score = Math.min(100, commercialIntent + philippinesRelevance + projectSpecificity + sourceAuthority + freshness + neasServiceFit);
  return {
    score,
    signalType,
    basis: {
      commercialIntent,
      philippinesRelevance,
      projectSpecificity,
      sourceAuthority,
      freshness,
      neasServiceFit,
      publishedAt: published,
      note: "Priority heuristic for research triage only; not a probability of winning, verified demand, project value, or expected revenue.",
    },
  };
}

function signalKey(url: string): string {
  const normalized = new URL(url);
  normalized.hash = "";
  normalized.hostname = normalized.hostname.toLowerCase();
  return createHash("sha256").update(normalized.toString().replace(/\/$/, "").toLowerCase()).digest("hex");
}

export function buildCommercialSignals(
  results: readonly GiieSearchResult[],
  topicGroup: CommercialTopicGroup,
  now = new Date(),
): CommercialSignal[] {
  const seen = new Set<string>();
  return results.flatMap((result): CommercialSignal[] => {
    let parsed: URL;
    try {
      parsed = new URL(result.url);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) return [];
    } catch {
      return [];
    }
    const key = signalKey(parsed.toString());
    if (seen.has(key)) return [];
    seen.add(key);
    const text = result.title + " " + result.description;
    const scored = scoreCommercialSignal(result, now);
    return [{
      signal_key: key,
      title: result.title.trim().slice(0, 500),
      source_url: parsed.toString(),
      source_name: result.sourceName.trim().slice(0, 200) || parsed.hostname,
      source_provider: "brave-search",
      industry: classifyCommercialIndustry(text, topicGroup.industry),
      signal_type: scored.signalType,
      geography: PH_TERMS.test(text) ? ["Philippines"] : ["Philippines (search target; location unverified)"],
      published_at: parsePublishedAt(result.publishedAt),
      discovered_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      seen_count: 1,
      discovery_score: scored.score,
      score_method: "commercial_opportunity_priority_v1",
      score_basis: scored.basis,
      evidence_excerpt: result.description.slice(0, 1_500),
      verification_status: "unverified",
      lead_status: "new",
      publication_status: "blocked_unverified",
      publication_reason: "Search-result metadata is an unverified lead. Public publishing requires source verification, independent corroboration, and a safe informational content classification.",
    }];
  });
}

export function evaluateAutoPublication(input: {
  evidenceClass: "verified-official" | "credible-secondary" | "unverified-claim" | "industry-opinion" | "ai-generated-hypothesis";
  independentSourceCount: number;
  contentType: "market-summary" | "company-claim" | "pricing" | "tender" | "safety-guidance" | "customer-communication";
  hasSourceCitations: boolean;
}): { eligible: boolean; reason: string } {
  if (input.contentType !== "market-summary") {
    return { eligible: false, reason: "This content category always requires owner approval." };
  }
  if (input.evidenceClass !== "verified-official") {
    return { eligible: false, reason: "Only verified official evidence may enter automatic informational publishing." };
  }
  if (input.independentSourceCount < 2) {
    return { eligible: false, reason: "At least two independent corroborating sources are required." };
  }
  if (!input.hasSourceCitations) {
    return { eligible: false, reason: "Source citations are mandatory for automatic publishing." };
  }
  return { eligible: true, reason: "Verified, corroborated, source-cited informational market summary meets the automatic publishing policy." };
}
