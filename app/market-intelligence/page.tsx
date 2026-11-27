"use client";

import { useMemo, useState } from "react";

type Competitor = {
  rank: number; name: string; tier: string; segment: string; base: string;
  services: string; evidence: string; status: string; url: string; contact: string;
};

const competitors: Competitor[] = [
  {rank:1,name:"Blade and Ropes Devt OPC",tier:"A",segment:"IRATA Operator + Trainer · Wind · Training",base:"Pangil, Laguna",services:"Rope-access operations and training, working-at-height and rescue, wind blade inspection/repair training and services.",evidence:"IRATA public member record 3176/OT lists the company as a Philippine Full Operator and Full Trainer. Current approved training venue, technician cards and project references still require direct checking.",status:"IRATA member record verified",url:"https://www.bladenropes.com/",contact:"+63 969 022 1825 · ace@bladenropes.com"},
  {rank:2,name:"Vertical Difficult Access Solutions, Inc.",tier:"A",segment:"High-rise · Wind turbine · PPE",base:"Lahug, Cebu City",services:"High-rise façade, cleaning, sealant, painting, anchor installation/pull tests; wind blade inspection/repair/cleaning and tower coating.",evidence:"Company-reported: established 2016; IRATA/GWO personnel; ISO 9001/14001/45001, PCAB and safety credentials. Obtain current certificates, scope, expiry and references.",status:"Company-reported credentials",url:"https://verticaldifficultaccess.com/collections/about-us",contact:"032 232 6788 · 0917 639 9199 · info@verticaldas.com"},
  {rank:3,name:"BIIS Corporation",tier:"A",segment:"Industrial · NDT · Power · Wind",base:"Lipa City, Batangas",services:"Rope access, conventional/advanced NDT, welding inspection, corrosion monitoring, piping/vessels, confined space and wind-related services.",evidence:"Company-reported: established 2016; detailed NDT and project pages. Request NDT qualifications, method-specific personnel records, client references and insurance.",status:"Public portfolio",url:"https://www.biiservices.com/",contact:"0998 556 9181 · 0920 240 1589 · biiscorp@biiservices.com"},
  {rank:4,name:"SkyQuest IRA Corporation",tier:"A",segment:"High-rise · Industrial · Wind · Rescue",base:"Pasig; regional offices advertised",services:"High-rise façade cleaning/painting, leak repair, waterproofing, vessels, wind turbines, smokestacks, bridges, towers, port cranes and rescue.",evidence:"Company-reported: broad footprint and named project gallery. Verify which projects specifically used rope access and obtain client-issued references.",status:"Public project gallery",url:"https://skyquestiracorporation.com/",contact:"info@skyquestiracorporation.com"},
  {rank:5,name:"Rope Access Services & Consulting, Inc. (RASC)",tier:"A",segment:"High-rise · Access systems · Training",base:"Parañaque, Metro Manila",services:"Façade cleaning/painting, waterproofing, sealants, crack injection, inspection, repairs, glass replacement, access-system consultancy and rescue training.",evidence:"Company-reported history from 2001; PhilJobNet directory lists address/services. Current IRATA membership and current training approvals not established in this review.",status:"Long operating history claimed",url:"https://ropeaccessasia.com/",contact:"+63 2 938 1763 · +63 2 801 3257 · info@ropeaccessasia.com"},
  {rank:6,name:"All Area Access Industrial Services, Inc.",tier:"A",segment:"Industrial · NDT · Power · Rescue",base:"Carmona, Cavite",services:"Industrial rope access, NDT/UTG, PT/MT/hardness testing, visual inspection, welding, repair, confined-space rescue, façade and training via MTCS/PAWSH partner.",evidence:"Company-reported project page describes GN Power Dinginin outage scopes and Aurelia Residences separator-beam installation. Third-party directory lists SEC number; obtain SEC-issued current records.",status:"Named project scopes published",url:"https://aaaindustrial.ph/projects",contact:"0918 962 2528 · aaaindustrialph@gmail.com"},
  {rank:7,name:"Eco Access Systems & Solutions, Inc.",tier:"A",segment:"Industrial · NDT · High-rise · Rescue",base:"Philippines",services:"Industrial/high-rise rope access, NDT (UTG/PT/hardness/MT), visual inspection, façade cleaning/repainting, internal maintenance, welding and rescue.",evidence:"Company-reported: founded 2017; public company profile and service portfolio. Verify training partner and PAWSH accreditation/scope directly.",status:"Public service portfolio",url:"https://ecoaccess.ph/",contact:"(046) 889 0543 · +63 946 728 8605 · eassi.sales@gmail.com"},
  {rank:8,name:"HJ Rope Master, Inc.",tier:"A",segment:"High-rise · Telecom · Wind · Offshore",base:"Pasig City",services:"High-rise, cell-site towers, industrial access, wind-turbine maintenance, offshore deployment, training, lifelines/anchors and gondola maintenance.",evidence:"Company-reported: established 2017; public service portfolio and licensed/insured claim. Verify insurance, technician matrix, membership and recent references.",status:"Broad service portfolio",url:"https://www.hjropemaster.com/",contact:"(02) 8463 5347 · +63 917 310 7131 · contactus@hjropemaster.com"},
  {rank:9,name:"Fornax Facility Supplies & Services, Inc. — Difficult Access",tier:"A",segment:"Industrial · Façade · Solar · NDT",base:"Taguig / Angeles City",services:"Façade, glass, sealant, repainting, restoration; stacks, silos, towers, solar panels, NDT and difficult-access manpower.",evidence:"Company-reported: refers to IRATA- or ISO-certified personnel. Exact member entity, certificates and roster are not published on the reviewed page.",status:"Service claim; credentials pending",url:"https://www.fornaxholdings.com/technical-services",contact:"0961 544 3373 · difficultaccessservices@fornax-fss.com"},
  {rank:10,name:"RETM Maintenance Rope Access Services",tier:"A",segment:"Oil & gas · Marine · Power · Offshore",base:"Philippines; specific HQ not confirmed",services:"Oil/gas, petrochemical, power, marine, offshore, inspection, NDT/UT, painting/coating, welding/mechanical, rescue and PPE inspection.",evidence:"Company-reported: IRATA-certified technicians and broad industrial portfolio. Legal entity, address, named projects, company membership and insurance need validation.",status:"Industrial capability claim",url:"https://retmrope.com/",contact:"0945 220 2545 · montalbonoel@yahoo.com"},
  {rank:11,name:"PESTECH Corporation / PESTECH Philippines website",tier:"B",segment:"Power · Substations · Industrial · Renewable",base:"Quezon City / Makati addresses",services:"Power infrastructure, substations/transmission, industrial/commercial façade, technical rope access and renewable services.",evidence:"Company-reported website advertises rope access and power-sector engineering. Verify Philippine legal entity, project references and in-house vs subcontracted crews.",status:"Adjacent power-engineering provider",url:"https://www.pestech.com.ph/",contact:"(02) 660 1497 · +63 918 9100 100 · pcorp_info@pestech.com.ph"},
  {rank:12,name:"ZaraWindTech Corp. / ZaraWindTech Philippines",tier:"B",segment:"Wind O&M · Blade repair · GWO / IRATA claims",base:"Davao City / Pasig City",services:"Wind O&M, blade inspection/composite repair, GWO/IRATA claims, solar and hybrid energy.",evidence:"Company-reported: Korean wind-service history, Davao launch in 2026, IRATA L1–L3, GWO, ISO 9001, ASNT Level II and offshore experience. Verify local legal status, cards, WINDA scope and Philippine references.",status:"New Philippine market entrant claim",url:"https://zarawindtech.com/en",contact:"Use official website contact channel"},
  {rank:13,name:"SGS Philippines (SGS Singapore rope-access service line)",tier:"B",segment:"Inspection · NDT · Structural surveys",base:"Makati",services:"Structural inspection/surveys and conventional/advanced NDT via rope access.",evidence:"SGS Philippines public contact is published; SGS rope-access page says operations are conducted in line with guidelines and identifies SGS Singapore as IRATA member. Not proof of a Philippine IRATA-member operator.",status:"International service-line evidence",url:"https://www.sgs.com/en-ph/services/industrial-rope-access",contact:"+63 2 8288 8787"},
  {rank:14,name:"Vonotec, Inc.",tier:"B",segment:"BMU · Façade access · Maintenance",base:"Makati",services:"BMU design/supply/installation/commissioning/maintenance; façade lifecycle services and rope access where appropriate.",evidence:"Company-reported: established 1994; façade/BMU specialist. Adjacent façade-access competitor, not proven here as industrial rope-access operator.",status:"Adjacent access-system provider",url:"https://vonotec.com.ph/",contact:"(+632) 801 6272"},
  {rank:15,name:"Derson Arc Cleaners Corporation",tier:"B",segment:"High-rise · Automated cleaning · Rope access",base:"Project 8, Quezon City",services:"Automated high-rise cleaning; rope-access window cleaning, resealant, painting and hard-access installation.",evidence:"Company-reported façade-services overlap. No independently checked IRATA membership or industrial NDT/offshore capability.",status:"Façade specialist",url:"https://www.dersonarc.com/",contact:"(02) 7759 4540 · +63 998 465 1379"},
  {rank:16,name:"ORA Manila Construction, Inc.",tier:"B",segment:"High-rise · Façade · Waterproofing",base:"Manila, Philippines",services:"High-rise façade maintenance, waterproofing, structural repair, sealants, coatings and anchor inspections.",evidence:"Company-reported technical rope-access positioning. Obtain registration, client references, technician credentials, HSE and insurance.",status:"Qualification required",url:"https://www.oramanila.com/",contact:"Official website contact form"},
  {rank:17,name:"BLB Corporation",tier:"B",segment:"Façade · Glass · Rope-access cleaning",base:"Quezon City",services:"Façade design, curtain wall, glass/aluminium, rope-access glass cleaning and exterior painting.",evidence:"Company-reported façade contractor with rope-access service line; no independently verified IRATA or industrial scope located.",status:"Adjacent façade contractor",url:"https://www.blbcorporations.com/",contact:"Official website contact"},
  {rank:18,name:"Judux",tier:"B",segment:"Infrastructure · Bridges · Towers",base:"Philippine operating base not established",services:"Rope access for high-rise structures, bridges, towers and confined spaces; infrastructure cleaning.",evidence:"Company-reported 2025 company profile. Treat as a lead requiring Philippine legal registration, operating base, credentials and local references.",status:"Market lead; local status unverified",url:"https://judux.com/",contact:"Official website contact"},
  {rank:19,name:"United Telecom Contractors Philippines, Inc. (UTCP)",tier:"B",segment:"Telecom · Tower · Rope access",base:"Philippines",services:"Telecom engineering, tower construction, radio/fibre, electrical/mechanical and rope-access/rappelling tower crews.",evidence:"Company-reported integrated telecom contractor. Verify direct employment, certification issuer and tower-client references.",status:"Adjacent telecom contractor",url:"https://www.utcpinc.com/",contact:"Official website contact"},
  {rank:20,name:"Leading Edge Specialized Services OPC",tier:"B",segment:"Industrial · Wind · IRATA technician pool",base:"Ilocos Norte / Philippines",services:"IRATA technician pooling for high-rise, wind turbine, industrial and elevated work.",evidence:"Directory-reported appearance in 2026 PCAB licensed-contractor PDF as Category AA. Company/social-reported technician pooling and Level 3 announcement. Verify exact legal entity, active PCAB status, certificates and projects.",status:"Specialist lead; verification required",url:"https://ph.linkedin.com/in/leading-edge-specialized-services-194b01223",contact:"+63 977 801 0695 · info@leading-edge.services"},
];

const sources = [
  ["IRATA member directory","https://irata.org/members/operators"],
  ["Blade and Ropes — IRATA member record","https://irata.org/members/details/blade-and-ropes-devt-opc"],
  ["IRATA membership requirements","https://irata.org/uploads/documents/QP-300ENG_IRATA_Membership_Requirements_003_01.01.2025.pdf"],
  ["SEC Company Registration System","https://appointment.sec.gov.ph/online-services/sec-company-registration-system/"],
  ["DOLE OSHC Department Orders","https://oshc.dole.gov.ph/department-orders/"],
  ["GWO WINDA","https://www.globalwindsafety.org/winda"],
  ["GWO training-provider finder","https://www.globalwindsafety.org/trainingproviders/findttraningprovider"],
  ["PAWSH training courses","https://pawsh.org.ph/training-courses"],
  ["DOE renewable projects","https://doe.gov.ph/renewable-energy-projects"],
  ["DOE GEA-5 recalibration notice, 29 July 2026","https://doe.gov.ph/news/press-releases/3585498--doe-sets-indicative-timeline-for-recalibrated-gea-5-offshore-wind-auction"],
  ["ERC offshore wind policy, 26 March 2026","https://www.erc.gov.ph/Events-Singular/308"],
  ["PCAB 2026 licensed contractor PDF","https://storage.googleapis.com/efoi-v2-prod/media/documents/List_of_Licensed_PCAB_Contractors_2026.pdf"],
];

const panel = {background:"rgba(255,255,255,.035)",border:"1px solid rgba(235,192,126,.16)",borderRadius:16,padding:18} as const;
const gold = "#EBC07E";
const text = "#f0ede8";
const muted = "#b7aa97";

export default function MarketIntelligencePage() {
  const [query,setQuery] = useState("");
  const [segment,setSegment] = useState("All");
  const segments = ["All","High-rise","Industrial","NDT","Wind","Offshore","Power","Telecom","Training","Façade"];
  const filtered = useMemo(() => competitors.filter((c) => {
    const q=query.trim().toLowerCase();
    const matchesQuery=!q || [c.name,c.base,c.services,c.segment,c.evidence].join(" ").toLowerCase().includes(q);
    const matchesSegment=segment==="All" || (segment==="NDT" ? /NDT/i.test(c.segment+" "+c.services) : (c.segment+" "+c.services).toLowerCase().includes(segment.toLowerCase()));
    return matchesQuery && matchesSegment;
  }),[query,segment]);

  return (
    <main style={{minHeight:"100vh",background:"radial-gradient(ellipse at 15% 0%,rgba(202,147,50,.12),transparent 36%),#090807",color:text,padding:"clamp(18px,4vw,52px)",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{maxWidth:1240,margin:"0 auto"}}>
        <nav style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:26}}>
          <a href="/" style={{color:gold,textDecoration:"none",fontSize:12,letterSpacing:".12em"}}>← NEAS APEX</a><a href="/market-intelligence/commercial" style={{color:gold,textDecoration:"none",fontSize:12,letterSpacing:".08em"}}>Commercial Opportunity Radar ↗</a>
          <a href="https://github.com/nextedgeaccesssolutions-ra/neas-apex/blob/main/docs/research/PHILIPPINES_ROPE_ACCESS_MARKET_INTELLIGENCE_2026.md" target="_blank" rel="noreferrer" style={{color:gold,fontSize:12}}>Full research methodology & report ↗</a>
        </nav>
        <header style={{marginBottom:28}}>
          <div style={{color:gold,fontSize:11,letterSpacing:".22em",fontWeight:800}}>NEAS APEX · COMMERCIAL INTELLIGENCE</div>
          <h1 style={{fontSize:"clamp(30px,5vw,58px)",lineHeight:1.02,margin:"12px 0",letterSpacing:"-.04em"}}>Philippines Rope Access Market</h1>
          <p style={{color:muted,fontSize:15,lineHeight:1.7,maxWidth:850,margin:0}}>Executive research snapshot · 2026 · Evidence-led competitor shortlist, industry segmentation and NEAS market positioning.</p>
          <div style={{color:"#8f877b",fontSize:11,marginTop:12}}>Research cut-off: 23 November 2026 · Public-source desk research · Static cached view for fast loading</div>
        </header>

        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:22}}>
          {[["20","Market shortlist entries"],["1","IRATA Full Operator + Trainer record identified"],["463 MW","Installed onshore wind in DOE Aug 2026 summary"],["0 MW","Installed offshore wind in same summary"]].map(([value,label])=><div key={label} style={panel}><div style={{fontSize:28,color:gold,fontWeight:800}}>{value}</div><div style={{fontSize:12,color:muted,lineHeight:1.5,marginTop:5}}>{label}</div></div>)}
        </section>

        <section style={{...panel,marginBottom:22}}>
          <h2 style={{fontSize:20,margin:"0 0 10px",color:gold}}>Executive conclusion</h2>
          <p style={{fontSize:14,lineHeight:1.75,margin:0}}>There is no defensible public basis in this research to declare one Philippine company the overall number-one rope-access contractor. Blade and Ropes Devt OPC has the clearest company-level IRATA membership record identified. BIIS and All Area Access publish relevant industrial/NDT project material; SkyQuest and RASC publish substantial façade/service histories; Vertical and ZaraWindTech publish notable wind-sector capability claims. NEAS should position as an engineering-led access, asset-integrity and renewable-energy services integrator.</p>
          <p style={{fontSize:12,color:muted,lineHeight:1.6,margin:"10px 0 0"}}>Important: this is a ranking of publicly visible relevance and evidence depth, not actual quality, revenue, market share or audited safety performance. Company claims are not independent verification.</p>
        </section>

        <section style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,flexWrap:"wrap",marginBottom:12}}>
            <div><h2 style={{fontSize:23,margin:"0 0 5px"}}>Top 20 research shortlist</h2><p style={{fontSize:12,color:muted,margin:0}}>Filter by company, location, services or segment. Tier A and B indicate public evidence density, not quality grades.</p></div>
            <div style={{fontSize:12,color:gold}}>{filtered.length} / 20 providers</div>
          </div>
          <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:14}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company, service, location…" style={{flex:"1 1 260px",minHeight:42,padding:"0 13px",borderRadius:10,border:"1px solid rgba(235,192,126,.28)",background:"#11100e",color:text,outline:"none"}}/>
            <select value={segment} onChange={e=>setSegment(e.target.value)} style={{minHeight:42,padding:"0 12px",borderRadius:10,border:"1px solid rgba(235,192,126,.28)",background:"#11100e",color:text}}>
              {segments.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:12}}>
            {filtered.map(c=><article key={c.rank} style={{...panel,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"start"}}>
                <div style={{fontSize:11,color:gold,fontWeight:800,letterSpacing:".1em"}}>#{c.rank} · TIER {c.tier}</div>
                <div style={{fontSize:10,color:c.rank===1?"#7bd6b0":muted,border:"1px solid rgba(235,192,126,.18)",padding:"4px 7px",borderRadius:20}}>{c.status}</div>
              </div>
              <h3 style={{fontSize:17,lineHeight:1.25,margin:"9px 0 5px"}}>{c.name}</h3>
              <div style={{fontSize:11,color:gold,marginBottom:7}}>{c.segment}</div>
              <div style={{fontSize:11,color:muted,marginBottom:9}}>⌖ {c.base}</div>
              <p style={{fontSize:12,lineHeight:1.6,margin:"0 0 10px"}}>{c.services}</p>
              <p style={{fontSize:11,lineHeight:1.55,color:muted,margin:"0 0 12px"}}>{c.evidence}</p>
              <div style={{fontSize:11,color:muted,marginBottom:10}}>{c.contact}</div>
              <a href={c.url} target="_blank" rel="noreferrer" style={{color:gold,fontSize:12,textDecoration:"none"}}>Official / public source ↗</a>
            </article>)}
          </div>
          {filtered.length===0 && <div style={panel}>No providers match this filter.</div>}
        </section>

        <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,440px),1fr))",gap:14,marginBottom:22}}>
          <div style={panel}>
            <h2 style={{fontSize:20,color:gold,margin:"0 0 10px"}}>Market segmentation</h2>
            <ul style={{fontSize:13,lineHeight:1.8,paddingLeft:20,margin:0}}>
              <li><b>High-rise façade:</b> RASC, SkyQuest, Vertical, HJ, Eco Access, All Area Access, Derson, ORA, BLB and Vonotec.</li>
              <li><b>Industrial / NDT / power:</b> BIIS, All Area Access, Eco Access, RETM, Fornax and PESTECH.</li>
              <li><b>Wind / renewables:</b> Vertical, HJ, BIIS, SkyQuest, Blade and Ropes and ZaraWindTech publish relevant services or training.</li>
              <li><b>Offshore / marine:</b> RETM, BIIS, HJ and SGS publish relevant capability claims; project approvals and deployed rosters need verification.</li>
              <li><b>Telecom / met mast:</b> HJ, UTCP, PESTECH and broad rope-access contractors overlap.</li>
              <li><b>Training:</b> Blade and Ropes has IRATA Full Trainer status in the public member record; PAWSH and GWO are separate frameworks.</li>
            </ul>
          </div>
          <div style={panel}>
            <h2 style={{fontSize:20,color:gold,margin:"0 0 10px"}}>Renewable market signal</h2>
            <p style={{fontSize:13,lineHeight:1.7,margin:"0 0 9px"}}>DOE's August 2026 summary reports 463 MW installed onshore wind and zero installed offshore wind. Existing onshore assets support recurring blade inspection, LEP, composite repair, tower corrosion, bolting and LPS work.</p>
            <p style={{fontSize:13,lineHeight:1.7,margin:0}}>GEA-5 targets 3,300 MW fixed-bottom offshore wind for 2028–2030, but DOE reported the process suspended pending recalibration in July 2026. The 1 December 2026 auction target was indicative as at this research cut-off—not a completed auction or an awarded project portfolio.</p>
          </div>
        </section>

        <section style={{...panel,marginBottom:22}}>
          <h2 style={{fontSize:20,color:gold,margin:"0 0 12px"}}>NEAS competitive position</h2>
          <p style={{fontSize:14,lineHeight:1.75}}>Recommended position: <b>Engineered Rope Access, Asset Integrity & Renewable Energy Services.</b> Productize three lines: Industrial Integrity (rope-access NDT, UT, inspection, coating, welding and outage support); Renewable & Wind (met mast, blade inspection/repair support, tower coating and LPS checks); High-Rise & Infrastructure (façade condition surveys, waterproofing, anchor systems and preventive maintenance).</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:12}}>
            {[
              ["Strengths to prove","Integrated commercial, industrial, telecom and renewable scope; engineering-led delivery; one accountable project interface."],
              ["Critical gaps","Company vs individual IRATA status; current SEC/PCAB/DOLE/insurance/ISO evidence; named client references; GWO WINDA and OEM blade credentials."],
              ["Premium differentiation","Level 3-led supervision, rescue planning, NDT/QA dossiers, asset registers, measurable HSE and warranties—not lowest labour rate."],
            ].map(([h,p])=><div key={h} style={{border:"1px solid rgba(235,192,126,.12)",borderRadius:12,padding:13}}><b style={{color:gold,fontSize:13}}>{h}</b><p style={{fontSize:12,lineHeight:1.6,color:muted,margin:"6px 0 0"}}>{p}</p></div>)}
          </div>
        </section>

        <section style={{...panel,marginBottom:22}}>
          <h2 style={{fontSize:20,color:gold,margin:"0 0 12px"}}>NEAS 12-month leadership roadmap</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
            {[
              ["Days 0–30 · Evidence","Build SEC/BIR/PCAB/DOLE/insurance/ISO/IRATA/GWO data room; technician expiry matrix; RAMS/JSA/rescue/ITP/NDT templates; three capability statements; verified case studies."],
              ["Days 31–90 · Pipeline","Build 25 named target accounts and 10 partner relationships (management targets); complete vendor registration; sell paid pilot inspections; formalize NDT, blade, GWO, coating and rescue partnerships."],
              ["Months 4–6 · Anchor work","Target two recurring frameworks; secure one industrial outage reference and one renewable reference; standardize Level 3 supervision and QA; monitor margin, cash conversion and safety."],
              ["Months 7–12 · Scale","Expand regional mobilization with audited partners; launch OEM-aligned wind/met mast package; publish annual asset-integrity brief; pursue offshore prequalification when requirements firm."],
            ].map(([h,p])=><div key={h} style={{borderLeft:"2px solid #CA9332",padding:"3px 0 3px 12px"}}><b style={{color:gold,fontSize:13}}>{h}</b><p style={{fontSize:12,lineHeight:1.65,color:muted,margin:"7px 0 0"}}>{p}</p></div>)}
          </div>
        </section>

        <section style={{...panel,marginBottom:22}}>
          <h2 style={{fontSize:20,color:gold,margin:"0 0 10px"}}>Weighted procurement scorecard</h2>
          <p style={{fontSize:12,color:muted,lineHeight:1.6}}>No numerical competitor scores are published because equivalent verified data is unavailable. Score each bidder 1–5 only after requesting the same evidence pack. A company website claim alone cannot score above 2.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:9}}>
            {[["Technical expertise","20%"],["Safety / compliance","20%"],["Projects / experience","20%"],["Service portfolio","15%"],["Market presence","15%"],["Certifications","10%"]].map(([h,w])=><div key={h} style={{background:"rgba(202,147,50,.08)",padding:11,borderRadius:10}}><b style={{fontSize:20,color:gold}}>{w}</b><div style={{fontSize:11,color:muted,marginTop:4}}>{h}</div></div>)}
          </div>
        </section>

        <section style={panel}>
          <h2 style={{fontSize:20,color:gold,margin:"0 0 10px"}}>Verified source directory</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:8}}>
            {sources.map(([name,url])=><a key={url} href={url} target="_blank" rel="noreferrer" style={{color:"#e8c98d",fontSize:12,textDecoration:"none",padding:"8px 0",borderBottom:"1px solid rgba(235,192,126,.1)"}}>{name} ↗</a>)}
          </div>
          <p style={{fontSize:11,color:muted,lineHeight:1.6,margin:"16px 0 0"}}>Research cut-off: 23 November 2026. Company credentials, current legal status, project claims, insurance and individual certification validity must be confirmed directly before procurement or investment decisions. Full detailed report: <a href="https://github.com/nextedgeaccesssolutions-ra/neas-apex/blob/main/docs/research/PHILIPPINES_ROPE_ACCESS_MARKET_INTELLIGENCE_2026.md" target="_blank" rel="noreferrer" style={{color:gold}}>GitHub research document</a>.</p>
        </section>
        <footer style={{fontSize:10,color:"#776e61",marginTop:24,textAlign:"center",letterSpacing:".12em"}}>NEAS APEX · PRIVATE BUSINESS INTELLIGENCE · PUBLIC-SOURCE RESEARCH SNAPSHOT</footer>
      </div>
    </main>
  );
}
