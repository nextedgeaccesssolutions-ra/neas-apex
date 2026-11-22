"use client";

export type SpecialistId = "auto" | "engineering" | "projects" | "safety" | "commercial" | "renewables" | "rope-access" | "business-development";
type Task = { label: string; prompt: string; specialist: SpecialistId };

const TASKS: Task[] = [
  {
    label: "Engineering consultation",
    specialist: "engineering",
    prompt: "Start an engineering consultation. Confirm the objective, asset, location, scope, constraints, and required deliverable. Ask me for the single most important missing input first.",
  },
  {
    label: "Engineering calculation",
    specialist: "engineering",
    prompt: "Start an engineering calculation. Identify the required inputs, units, assumptions, methodology, formula, limitations, and competent-person review needed. Ask for the most important missing input before calculating.",
  },
  {
    label: "BOQ and costing",
    specialist: "commercial",
    prompt: "Start a BOQ and project cost estimate. Separate materials, labor, equipment, consumables, mobilization, transport, overhead, contingency, taxes, markup, retention, and payment terms. Confirm currency and ask for the most important missing quantity or scope input.",
  },
  {
    label: "Method statement",
    specialist: "safety",
    prompt: "Start a method statement draft. Establish scope, sequence, resources, equipment, permits, interfaces, inspection points, emergency arrangements, and required approvals. Keep safety-critical procedures at a planning level pending competent-person review.",
  },
  {
    label: "Risk assessment / JSA",
    specialist: "safety",
    prompt: "Start a project risk assessment and JSA. Identify the activity, worksite, hazards, persons exposed, controls, residual risk, permits, emergency response, and review responsibilities. Ask for the most important missing site detail.",
  },
  {
    label: "Inspection report",
    specialist: "engineering",
    prompt: "Start an engineering inspection report. Ask for asset details, inspection scope, methods, access constraints, observed evidence, acceptance criteria, photos or records available, limitations, and required sign-off. Never invent findings.",
  },
  {
    label: "Project schedule",
    specialist: "projects",
    prompt: "Start a project schedule and resource plan. Identify deliverables, work breakdown, quantities, crew, equipment, access windows, dependencies, mobilization, productivity assumptions, milestones, and constraints.",
  },
  {
    label: "Technical troubleshooting",
    specialist: "engineering",
    prompt: "Start a technical troubleshooting and root-cause analysis. Establish the symptom, operating conditions, timeline, evidence, recent changes, safety constraints, and tests already performed. Separate facts from hypotheses.",
  },
  {
    label: "Feasibility study",
    specialist: "projects",
    prompt: "Start a project feasibility assessment. Evaluate technical scope, site conditions, access, engineering constraints, HSE, logistics, schedule, cost drivers, commercial risks, assumptions, and go/no-go criteria.",
  },
  {
    label: "Renewable energy analysis",
    specialist: "renewables",
    prompt: "Start a wind or solar engineering assessment. Confirm project type, location, asset details, capacity, site conditions, access, metocean or resource data available, grid and logistics interfaces, and required deliverables.",
  },
  {
    label: "Procurement support",
    specialist: "commercial",
    prompt: "Start an engineering procurement review. Define the specification, quantities, standards, approved equivalents, supplier evidence, delivery requirements, inspection documents, warranty, and commercial comparison criteria.",
  },
  {
    label: "Business development",
    specialist: "business-development",
    prompt: "Start a NEAS project opportunity qualification. Identify client, company, project location, asset, service need, scope and approximate quantity, timeline, procurement route, decision-maker, and next follow-up action. Do not claim outreach has been sent.",
  },
  {
    label: "Rope access work pack",
    specialist: "rope-access",
    prompt: "Start a rope access work pack. Establish the work scope, asset and access geometry, anchor and rigging information available, team competence, equipment, rescue plan, permits, exclusion zones, weather limits, interfaces, inspection records, and competent-person approvals. Do not invent anchor capacities or certify a rigging plan.",
  },
];

export default function EngineeringAITaskEngine({
  disabled = false,
  onLaunch,
}: {
  disabled?: boolean;
  onLaunch: (prompt: string, specialist: SpecialistId) => void;
}) {
  return (
    <details style={{ border: "1px solid rgba(202,147,50,.2)", borderRadius: 10, background: "rgba(202,147,50,.045)" }}>
      <summary style={{ cursor: "pointer", padding: "9px 11px", color: "#EBC07E", fontSize: 9, fontWeight: 800, letterSpacing: ".16em", listStylePosition: "inside" }}>
        ENGINEERING TASKS · 13 WORKFLOWS
      </summary>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, padding: "0 9px 9px" }}>
        {TASKS.map((task) => (
          <button
            key={task.label}
            type="button"
            disabled={disabled}
            onClick={() => onLaunch(task.prompt, task.specialist)}
            style={{
              minHeight: 35,
              border: "1px solid rgba(235,192,126,.22)",
              borderRadius: 8,
              padding: "6px 8px",
              background: "rgba(7,29,41,.78)",
              color: "#f5ead8",
              fontSize: 9,
              lineHeight: 1.25,
              textAlign: "left",
              cursor: disabled ? "wait" : "pointer",
              opacity: disabled ? .5 : 1,
            }}
          >
            {task.label}
          </button>
        ))}
      </div>
    </details>
  );
}
