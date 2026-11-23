-- NEAS AI Workforce Skills Registry + automatic department assignment
-- Idempotent. Existing agents remain draft_only; this migration does not enable execution.
create table if not exists public.aiw_skill_catalog (
  skill_key text primary key,
  category text not null,
  name text not null,
  description text not null,
  operating_guidance text not null,
  priority smallint not null default 50 check (priority between 1 and 100),
  guardrails jsonb not null default '[]'::jsonb,
  version integer not null default 1 check (version > 0),
  lifecycle_status text not null default 'active' check (lifecycle_status in ('draft','active','deprecated','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.aiw_agent_skill_assignments (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.aiw_agents(agent_id) on delete cascade,
  skill_key text not null references public.aiw_skill_catalog(skill_key) on delete restrict,
  priority smallint not null default 50 check (priority between 1 and 100),
  proficiency text not null default 'working' check (proficiency in ('foundational','working','advanced','expert')),
  enabled boolean not null default true,
  assignment_source text not null default 'manual',
  agent_specific_guidance text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_id,skill_key)
);
create table if not exists public.aiw_skill_evaluations (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.aiw_agents(agent_id) on delete cascade,
  skill_key text not null references public.aiw_skill_catalog(skill_key) on delete restrict,
  test_name text not null,
  evaluation_status text not null default 'not_tested' check (evaluation_status in ('not_tested','passed','failed','needs_review','blocked')),
  score numeric(5,2) check (score is null or (score between 0 and 100)),
  evidence_reference text,
  notes text not null default '',
  evaluated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists aiw_skill_catalog_category_idx on public.aiw_skill_catalog(category,lifecycle_status);
create index if not exists aiw_agent_skill_assignments_agent_idx on public.aiw_agent_skill_assignments(agent_id,enabled,priority);
create index if not exists aiw_agent_skill_assignments_skill_idx on public.aiw_agent_skill_assignments(skill_key,enabled);
create index if not exists aiw_skill_evaluations_agent_idx on public.aiw_skill_evaluations(agent_id,evaluated_at desc);
alter table public.aiw_skill_catalog enable row level security;
alter table public.aiw_agent_skill_assignments enable row level security;
alter table public.aiw_skill_evaluations enable row level security;
drop policy if exists aiw_skill_catalog_authenticated_read on public.aiw_skill_catalog;
create policy aiw_skill_catalog_authenticated_read on public.aiw_skill_catalog for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists aiw_agent_skill_assignments_authenticated_read on public.aiw_agent_skill_assignments;
create policy aiw_agent_skill_assignments_authenticated_read on public.aiw_agent_skill_assignments for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists aiw_skill_evaluations_authenticated_read on public.aiw_skill_evaluations;
create policy aiw_skill_evaluations_authenticated_read on public.aiw_skill_evaluations for select to authenticated using ((select auth.uid()) is not null);
grant select on public.aiw_skill_catalog,public.aiw_agent_skill_assignments,public.aiw_skill_evaluations to authenticated;
grant all on public.aiw_skill_catalog,public.aiw_agent_skill_assignments,public.aiw_skill_evaluations to service_role;

insert into public.aiw_skill_catalog(category,skill_key,name,description,operating_guidance,priority,guardrails)
values
('AI Technology and Automation','ai:architecture','AI systems architecture','Designs maintainable AI system boundaries, model routing, interfaces, resilience and observability.','Produce architecture decisions, dependency maps, interface contracts, failure modes and staged implementation plans.',10),
('AI Technology and Automation','ai:software-api','Software and API engineering','Builds and reviews secure application code, API contracts, validation and integration tests.','Use typed contracts, input validation, least privilege, deterministic errors and regression tests.',20),
('AI Technology and Automation','ai:data-governance','Database and data governance','Designs normalized schemas, migrations, data quality, retention and access boundaries.','Use constraints, indexes, provenance, retention rules, reviewed migrations and rollback plans.',30),
('AI Technology and Automation','ai:cybersecurity','Cybersecurity and access control','Assesses authentication, authorization, secrets, threats and secure defaults.','Keep secrets server-side; enforce deny-by-default access, RLS, audit trails and evidence-based remediation.',40),
('AI Technology and Automation','ai:cloud-devops','Cloud and DevOps operations','Plans CI/CD, cloud infrastructure, deployment, reliability and recovery.','Use staged releases, health checks, backups, rollback paths, observability and cost controls.',50),
('AI Technology and Automation','ai:quality-automation','Automation testing and monitoring','Builds test strategy, regression checks, quality gates and incident monitoring.','Define acceptance criteria, reproducible tests, alert thresholds, failure triage and post-change verification.',60),
('Business Development and Sales','sales:account-research','Target-account research','Finds relevant buyers, project owners, procurement channels and evidence-backed NEAS opportunities.','Prioritize official sources, buyer roles, project announcements, source dates and service-fit rationale.',10),
('Business Development and Sales','sales:qualification','Lead qualification and scoring','Scores opportunities by scope fit, budget signals, timing, buyer access, competition and delivery capability.','Separate confirmed facts from assumptions; record evidence, confidence, qualification gaps and next action.',20),
('Business Development and Sales','sales:crm','CRM pipeline and data hygiene','Maintains accurate account, contact, lead, opportunity, stage and follow-up records.','Deduplicate records; preserve provenance, stage criteria, accountable owner and auditable changes.',30),
('Business Development and Sales','sales:proposal','Proposal and tender development','Prepares compliant technical-commercial proposals, tender matrices, clarifications and submission checklists.','Map requirements to evidence; flag exclusions and assumptions; require human approval before submission.',40),
('Business Development and Sales','sales:followup','Sales follow-up and relationship management','Plans client follow-ups, meeting preparation, account nurturing and relationship continuity.','Draft communications only; never claim outreach or promise price, scope or schedule without approval.',50),
('Business Development and Sales','sales:partnerships','Strategic partnerships and market development','Evaluates delivery partners, referral channels, alliances and international market entry.','Assess capability, references, conflicts, legal/commercial risks and approvals before commitments.',60),
('Engineering and Technical','engineering:scope','Technical scope interpretation','Breaks rope access, wind, met mast, telecom, NDT, electrical and industrial scopes into work packages.','List deliverables, interfaces, exclusions, site conditions, assumptions and acceptance criteria.',10),
('Engineering and Technical','engineering:calculations','Engineering calculation support','Organizes calculation inputs, load cases, equations, assumptions and independent review requirements.','Show units, equations, input sources, limitations and uncertainty; never approve safety-critical designs.',20),
('Engineering and Technical','engineering:standards','Standards and specification verification','Identifies applicable standards, client specifications, revision status and compliance evidence.','Verify current editions from authoritative sources; do not invent clauses or claim certification.',30),
('Engineering and Technical','engineering:inspection','Inspection and test planning','Develops inspection plans, checklists, test sequences, acceptance criteria and defect reporting.','Identify competent-person requirements, calibrated equipment, traceability and hold points.',40),
('Engineering and Technical','engineering:documentation','Technical documentation and reporting','Produces work packs, inspection reports, calculation registers and closeout dossiers.','Maintain revision control, traceability, evidence references, limitations and reviewer sign-off fields.',50),
('Engineering and Technical','engineering:competent-review','Competent-person review coordination','Identifies decisions requiring qualified engineers, IRATA/GWO personnel or NDT specialists.','Escalate qualification gaps; never claim an AI agent is certified or authorized to approve work.',60),
('Executive Management','executive:strategy','Corporate strategy and growth planning','Evaluates service-line growth, market entry, partnerships and resource allocation.','Present options, assumptions, downside risks, measurable outcomes and owner-reserved decisions.',10),
('Executive Management','executive:kpi','Executive KPI and performance analysis','Analyzes revenue, margin, cash, pipeline, delivery, safety and quality performance.','Use source-backed figures, explicit periods and metric definitions; flag missing or poor-quality data.',20),
('Executive Management','executive:risk','Enterprise risk oversight','Identifies strategic, financial, operational, legal, safety, cyber and reputational risks.','Rank likelihood and impact transparently; propose mitigation and human ownership.',30),
('Executive Management','executive:governance','Governance and decision rights','Maintains delegated authority, controls, policy consistency and escalation paths.','Distinguish recommendation from authorization; preserve owner approval for reserved matters.',40),
('Executive Management','executive:decision-brief','Executive decision briefs','Converts complex information into options, recommendations, costs, risks and decisions required.','Cite evidence, quantify uncertainty, disclose conflicts and identify approvals needed.',50),
('Executive Management','executive:cross-functional','Cross-functional leadership coordination','Aligns departments, dependencies, accountability and execution cadence.','Do not create commitments for other departments; record accountable human owners and due dates.',60),
('Finance and Administration','finance:boq','BOQ and quantity take-off analysis','Reviews quantities, units, scope boundaries, productivity assumptions and BOQ completeness.','Show calculation basis, source drawings, exclusions, measurement rules and quantity risks.',10),
('Finance and Administration','finance:costing','Project costing and pricing analysis','Builds direct/indirect cost models, labor/equipment rates, overhead, contingency, markup and margin scenarios.','Label estimates and assumptions; never issue binding quotations or approve commitments.',20),
('Finance and Administration','finance:cashflow','Cash-flow forecasting','Models mobilization, progress billing, retention, collection timing, supplier terms and working capital.','Show timing assumptions, sensitivities and funding gaps; do not initiate payments or transfers.',30),
('Finance and Administration','finance:receivables-payables','Receivables and payables monitoring','Tracks aging, due dates, supporting documents, payment status and collection priorities.','Treat payment status as unverified without authorized records; never execute payments.',40),
('Finance and Administration','finance:tax-payroll','Tax, VAT and payroll documentation support','Organizes tax, payroll, VAT and statutory documentation and reconciliation support.','Flag jurisdiction and period; require accountant review for filings and final payroll.',50),
('Finance and Administration','finance:contracts-audit','Commercial contract and financial control review','Checks payment terms, retention, variations, liability, documentation and financial controls.','Identify issues for human/legal review; never sign, amend or accept contract terms.',60),
('HSEQ and Compliance','hseq:risk','Hazard identification and risk assessment','Structures hazards, persons exposed, risk ratings, controls, residual risk and action ownership.','Use site-specific evidence; never declare a site safe or authorize work.',10),
('HSEQ and Compliance','hseq:method','JSA/JHA and method statement review','Reviews work sequence, manpower, equipment, access, exclusion zones, rescue and emergency controls.','Flag missing controls and competent-person approvals; drafts are not permits or work authorization.',20),
('HSEQ and Compliance','hseq:permit','Permit-to-work and isolation coordination','Checks permit prerequisites, isolations, simultaneous operations and permit interfaces.','Never issue, approve, extend or close permits; only authorized site personnel may do so.',30),
('HSEQ and Compliance','hseq:rescue','Work-at-height and rope rescue readiness','Reviews rescue scenarios, equipment, team competence evidence, communications and response plans.','Do not replace site rescue planning or drills; escalate unverified readiness.',40),
('HSEQ and Compliance','hseq:ppe','PPE and equipment inspection records','Organizes PPE registers, inspection intervals, defect quarantine and traceability.','Never certify equipment from incomplete data; defective items require authorized isolation.',50),
('HSEQ and Compliance','hseq:incident-audit','Incident investigation and audit','Supports evidence capture, causal analysis, audit findings and corrective action tracking.','Preserve factual neutrality, confidentiality and evidence integrity; require human review.',60),
('Marketing and Global Expansion','marketing:seo','Technical SEO and search visibility','Plans crawlability, indexation, structured data, keyword mapping and technical SEO remediation.','Use verified Search Console/analytics data; never promise rankings or fabricate performance.',10),
('Marketing and Global Expansion','marketing:content','Technical content and conversion copywriting','Creates accurate service pages, case studies, landing pages and industrial-buyer content.','Avoid unsupported claims, invented certifications, fake testimonials or guaranteed outcomes.',20),
('Marketing and Global Expansion','marketing:campaign','Campaign planning and performance','Plans audiences, offers, funnels, creative tests, budgets and measurable outcomes.','Advertising spend and campaign publication require explicit approval.',30),
('Marketing and Global Expansion','marketing:market','Competitor and international market research','Compares markets, competitors, procurement routes, regulations and buyer demand.','Use dated sources, separate facts from inference, and respect privacy and source terms.',40),
('Marketing and Global Expansion','marketing:conversion','Website UX and lead conversion optimization','Improves service discovery, trust signals, enquiry paths, page speed and conversion measurement.','Do not publish or change production website content without approved release controls.',50),
('Marketing and Global Expansion','marketing:analytics','Marketing analytics and reporting','Analyzes traffic, rankings, engagement, lead quality, conversion and campaign economics.','Define metrics and date ranges; distinguish measured results from modeled attribution.',60),
('Project Management and Operations','project:wbs','Project scope and WBS development','Breaks work into deliverables, activities, dependencies and acceptance criteria.','Use approved scope baselines; flag assumptions, exclusions and scope changes.',10),
('Project Management and Operations','project:schedule','Planning, scheduling and critical path','Builds logic-linked schedules, milestones, constraints, look-aheads and schedule risk analysis.','Distinguish baseline from forecast; do not promise dates without resource/site confirmation.',20),
('Project Management and Operations','project:resources','Manpower and resource deployment','Plans competent manpower, shifts, equipment, access windows, logistics and mobilization.','Verify availability, competence evidence, fatigue limits and client/site restrictions.',30),
('Project Management and Operations','project:procurement','Procurement and logistics planning','Prepares specifications, bid comparisons, lead-time plans and material readiness.','Purchases, POs and supplier commitments require human approval.',40),
('Project Management and Operations','project:site','Site operations and interface coordination','Coordinates work fronts, access, permits, interfaces, progress constraints and handovers.','Never override site authority, permit controls or safety stop-work decisions.',50),
('Project Management and Operations','project:reporting','Progress, cost, risk and closeout reporting','Consolidates progress evidence, productivity, variations, risk, quality and handover status.','Use dated records; flag missing evidence and avoid unsupported progress claims.',60),
('Training and Human Capital','training:design','Training program and curriculum design','Develops learning objectives, course outlines, lesson plans, practical exercises and assessments.','Align to current provider requirements; distinguish internal training from accredited certification.',10),
('Training and Human Capital','training:irata-gwo','IRATA and GWO training administration','Supports course administration, prerequisites, schedules and provider compliance records.','Never issue or validate certification; verify current requirements with awarding bodies.',20),
('Training and Human Capital','training:competency','Competency matrix and workforce records','Maintains role requirements, competency evidence, expiry tracking and refresher needs.','Protect personal data; do not infer competence from job title or incomplete certificates.',30),
('Training and Human Capital','training:assessment','Assessment evidence and quality assurance','Structures assessment criteria, evidence capture, assessor feedback and moderation.','Final competence decisions remain with authorized qualified assessors.',40),
('Training and Human Capital','training:recruitment','Recruitment and onboarding workflow support','Organizes role profiles, candidate screening evidence and onboarding checklists.','Protect candidate data; hiring and employment decisions require authorized human review.',50),
('Training and Human Capital','training:workforce','Workforce development and performance support','Tracks development plans, training needs, performance indicators and succession readiness.','Use fair, evidence-based criteria; do not make final employment decisions.',60)
on conflict(skill_key) do update set category=excluded.category,name=excluded.name,description=excluded.description,
 operating_guidance=excluded.operating_guidance,priority=excluded.priority,guardrails=excluded.guardrails,
 version=public.aiw_skill_catalog.version+1,updated_at=now();

create or replace function public.aiw_auto_assign_department_skills()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  delete from public.aiw_agent_skill_assignments a
   where a.agent_id=new.agent_id and a.assignment_source='auto:department'
     and not exists(select 1 from public.aiw_skill_catalog s where s.skill_key=a.skill_key and s.category=new.department and s.lifecycle_status='active');
  insert into public.aiw_agent_skill_assignments(agent_id,skill_key,priority,proficiency,enabled,assignment_source,agent_specific_guidance)
  select new.agent_id,s.skill_key,s.priority,'working',true,'auto:department',
    'Role: '||new.name||'. Mandate: '||coalesce(new.job_description,'')||' Skill focus: '||s.operating_guidance
  from public.aiw_skill_catalog s
  where s.category=new.department and s.lifecycle_status='active'
  on conflict(agent_id,skill_key) do update set priority=excluded.priority,enabled=true,
    agent_specific_guidance=excluded.agent_specific_guidance,updated_at=now()
  where public.aiw_agent_skill_assignments.assignment_source='auto:department';
  update public.aiw_agents ag set skills=coalesce((
    select jsonb_agg(s.name order by a.priority,s.skill_key)
    from public.aiw_agent_skill_assignments a join public.aiw_skill_catalog s using(skill_key)
    where a.agent_id=new.agent_id and a.enabled and s.lifecycle_status='active'
  ),'[]'::jsonb)
  where ag.agent_id=new.agent_id;
  return new;
end;
$$;
revoke all on function public.aiw_auto_assign_department_skills() from public,anon,authenticated;
drop trigger if exists aiw_agents_auto_assign_department_skills on public.aiw_agents;
create trigger aiw_agents_auto_assign_department_skills
after insert or update of department on public.aiw_agents
for each row execute function public.aiw_auto_assign_department_skills();

-- Backfill all existing agents through the same trigger used for future agent creation/department changes.
update public.aiw_agents set department=department;
