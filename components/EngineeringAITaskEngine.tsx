"use client";

type Task = { label: string; prompt: string };

const BRAINS: Task[] = [
  { label: "01 · Engineering Reasoning", prompt: "Activate BRAIN 01 — ENGINEERING REASONING. Act as NEAS Chief Engineering Analyst. Assess the technical problem, root cause, feasibility, alternatives, supplied evidence, assumptions, calculations, units, limitations and required competent-person verification. Ask one critical missing question at a time." },
  { label: "02 · Project Intelligence", prompt: "Activate BRAIN 02 — PROJECT INTELLIGENCE. Act as NEAS Engineering Project Director. Structure the scope, deliverables, WBS, sequence, dependencies, schedule, manpower, equipment, procurement, productivity, QA/QC, HSE, risks and progress controls. Separate planned, actual, forecast and verified status." },
  { label: "03 · Safety Intelligence", prompt: "Activate BRAIN 03 — SAFETY INTELLIGENCE. Act as NEAS Engineering Safety and Risk Advisor. Prepare a preliminary hazard/risk review using the hierarchy of controls, residual risk, responsibilities, permits and emergency arrangements. Identify competent-person review and stop-work conditions; never approve unsafe work." },
  { label: "04 · Commercial Intelligence", prompt: "Activate BRAIN 04 — COMMERCIAL INTELLIGENCE. Act as NEAS Engineering Commercial Director. Build the BOQ/cost model, separating materials, labor, equipment, logistics, subcontractors, indirect costs, contingency, tax, markup, gross margin, cash flow, retention and payment terms. State currency, assumptions and exclusions; do not invent supplier prices." },
  { label: "05 · Renewable Energy", prompt: "Activate BRAIN 05 — RENEWABLE ENERGY INTELLIGENCE. Assess wind, blade, solar PV, offshore/onshore, met mast or Lidar scope. Consider asset data, access, weather, environment, competence, logistics, inspection/maintenance requirements, quality, HSE and deliverables." },
  { label: "06 · Industrial Intelligence", prompt: "Activate BRAIN 06 — INDUSTRIAL INTELLIGENCE. Assess industrial maintenance, mechanical, electrical, welding, cable pulling, NDT, corrosion, power plant or shutdown scope. Select inspection methods only from the supplied material, geometry, defect objective, access and acceptance criteria. State limitations and required approvals." },
  { label: "07 · Business Strategy", prompt: "Activate BRAIN 07 — BUSINESS STRATEGY. Act as NEAS Engineering Business Development Director. Qualify the opportunity, client need, service fit, project location, asset, scope, quantity, schedule, procurement route, competition, delivery risk, working capital, commercial potential and next responsible action." },
];

const TASKS: Task[] = [
  { label: "Engineering consultation", prompt: "Start an engineering consultation. Confirm the objective, asset, location, scope, constraints and required deliverable. Ask for the single most important missing input first." },
  { label: "Engineering calculation", prompt: "Start an engineering calculation. Identify required inputs, units, assumptions, methodology, formula, limitations and competent-person review. Ask for the most important missing input before calculating." },
  { label: "BOQ and costing", prompt: "Start a BOQ and project cost estimate. Separate materials, labor, equipment, consumables, mobilization, transport, overhead, contingency, taxes, markup, retention and payment terms. Confirm currency and quantities." },
  { label: "Method statement", prompt: "Draft a method statement plan. Establish scope, sequence, resources, equipment, permits, interfaces, inspection points, emergency arrangements and required approvals. Keep safety-critical procedures pending competent-person review." },
  { label: "Risk assessment / JSA", prompt: "Start a preliminary risk assessment and JSA. Identify activity, worksite, hazards, persons exposed, controls, residual risk, permits, emergency response and review responsibilities." },
  { label: "Inspection report", prompt: "Draft an engineering inspection report. Confirm asset, inspection scope, methods, access constraints, observed evidence, acceptance criteria, records, limitations and required sign-off. Never invent findings." },
  { label: "Project schedule", prompt: "Build a project schedule and resource plan. Identify deliverables, WBS, quantities, crew, equipment, access windows, dependencies, mobilization, productivity assumptions, milestones and constraints." },
  { label: "Technical troubleshooting", prompt: "Start technical troubleshooting and root-cause analysis. Establish symptom, operating conditions, timeline, evidence, recent changes, safety constraints and tests already performed. Separate facts from hypotheses." },
  { label: "Feasibility study", prompt: "Prepare a project feasibility assessment. Evaluate technical scope, site conditions, access, engineering constraints, HSE, logistics, schedule, cost drivers, commercial risks, assumptions and go/no-go criteria." },
  { label: "Renewable energy analysis", prompt: "Start a wind or solar engineering assessment. Confirm project type, location, asset details, capacity, site conditions, access, resource data, grid/logistics interfaces and required deliverables." },
  { label: "Procurement support", prompt: "Start an engineering procurement review. Define specification, quantities, standards, approved equivalents, supplier evidence, delivery requirements, inspection documents, warranty and commercial comparison criteria." },
  { label: "Business development", prompt: "Qualify a NEAS project opportunity. Identify client, service need, location, asset, scope and quantity, timeline, procurement route, decision-maker and next follow-up action. Do not claim outreach has been sent." },
];

function TaskGrid({ tasks, title, disabled, onLaunch }: { tasks: Task[]; title: string; disabled: boolean; onLaunch: (prompt: string) => void }) {
  return (
    <details style={{ border: "1px solid rgba(202,147,50,.2)", borderRadius: 10, background: "rgba(202,147,50,.045)" }}>
      <summary style={{ cursor: "pointer", padding: "9px 11px", color: "#EBC07E", fontSize: 9, fontWeight: 800, letterSpacing: ".16em", listStylePosition: "inside" }}>
        {title}
      </summary>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, padding: "0 9px 9px" }}>
        {tasks.map((task) => (
          <button key={task.label} type="button" disabled={disabled} onClick={() => onLaunch(task.prompt)}
            style={{ minHeight: 35, border: "1px solid rgba(235,192,126,.22)", borderRadius: 8, padding: "6px 8px", background: "rgba(7,29,41,.78)", color: "#f5ead8", fontSize: 9, lineHeight: 1.25, textAlign: "left", cursor: disabled ? "wait" : "pointer", opacity: disabled ? .5 : 1 }}>
            {task.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export default function EngineeringAITaskEngine({ disabled = false, onLaunch }: { disabled?: boolean; onLaunch: (prompt: string) => void }) {
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <TaskGrid tasks={BRAINS} title="SEVEN SPECIALIST BRAINS · ROUTE A TASK" disabled={disabled} onLaunch={onLaunch} />
      <TaskGrid tasks={TASKS} title="ENGINEERING TASKS · 12 WORKFLOWS" disabled={disabled} onLaunch={onLaunch} />
    </div>
  );
}
