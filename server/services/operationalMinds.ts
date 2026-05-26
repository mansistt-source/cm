export type WorkflowType =
  | "film_maker"
  | "marketing_agent"
  | "youtube_documentary"
  | "ugc_avatar"
  | "service_agent";

export type ModelLane =
  | "director"
  | "router"
  | "long_context"
  | "creative"
  | "multimodal"
  | "deterministic"
  | "provider_execution";

export type AgentDef = {
  id: string;
  module: string;
  lane: ModelLane;
  purpose: string;
  skills: string[];
  paid: boolean;
  internet: boolean;
  output: string[];
};

export type SkillDoc = {
  id: string;
  category: string;
  description: string;
  when: string[];
  inputs: string[];
  outputs: string[];
  keywords: string[];
  paid: boolean;
};

export type OperationInput = {
  workflowType?: WorkflowType;
  serviceType?: string;
  prompt: string;
  durationSeconds?: number;
  quality?: "draft" | "standard" | "premium";
  complexity?: "light" | "normal" | "deep";
  researchMode?: "none" | "light" | "deep";
  assetsCount?: number;
  referencesCount?: number;
  variants?: number;
};

export type OperationEstimate = {
  creditsPerUsd: number;
  estimatedLowCredits: number;
  estimatedHighCredits: number;
  requiredCredits: number;
  estimatedLowUsd: number;
  estimatedHighUsd: number;
  explanation: string;
  internalBreakdown: Record<string, number>;
};

export type AgentAttachment = AgentDef & {
  promptPack: {
    system: string;
    inputContract: string[];
    outputContract: string[];
    guardrails: string[];
  };
  ragSkills: Array<SkillDoc & { score: number; matched: string[] }>;
  selfEvaluation: string[];
};

export type BranchSpec = {
  id: string;
  title: string;
  agents: string[];
  dependsOn: string[];
  canRunInParallel: boolean;
};

export type OperationalPlan = {
  id: string;
  workflowType: WorkflowType;
  prompt: string;
  estimate: OperationEstimate;
  agentPath: AgentAttachment[];
  branches: BranchSpec[];
  aggregation: {
    aggregatorAgent: string;
    deliverables: string[];
    mergeRule: string;
  };
  status: "preview" | "dry_ready" | "dry_completed";
};

export type DryRunResult = {
  plan: OperationalPlan;
  branches: Array<{
    branchId: string;
    title: string;
    status: "completed_dry_run";
    outputs: Array<{
      agentId: string;
      artifactType: string;
      summary: string;
      selectedSkills: string[];
      confidence: number;
    }>;
  }>;
  assembledDelivery: {
    status: "assembled_dry_run";
    summary: string;
    deliverables: string[];
    nextAction: string;
  };
};

export const MODEL_LANES: Record<ModelLane, { purpose: string; dryRun: string; realProvider: string }> = {
  director: {
    purpose: "High-level orchestration, goal understanding, cross-agent judgement.",
    dryRun: "Return structured decisions from registry and input only.",
    realProvider: "Claude/GPT high reasoning later",
  },
  router: {
    purpose: "Cheap routing, classification, branching decisions.",
    dryRun: "Keyword and workflow based routing.",
    realProvider: "Small/fast model later",
  },
  long_context: {
    purpose: "Large reference digestion, memory, research packets.",
    dryRun: "Use supplied prompt/project metadata only.",
    realProvider: "Gemini long context later",
  },
  creative: {
    purpose: "Hooks, scripts, storyboards, prompts and campaign assets.",
    dryRun: "Generate structured placeholder artifacts.",
    realProvider: "Claude/GPT creative lane later",
  },
  multimodal: {
    purpose: "Image/video/reference inspection and QA.",
    dryRun: "Metadata-only checks until multimodal model is enabled.",
    realProvider: "Gemini/OpenAI multimodal later",
  },
  deterministic: {
    purpose: "Exact math, wallet, status, task graph, validation.",
    dryRun: "Server code only.",
    realProvider: "No model",
  },
  provider_execution: {
    purpose: "Higgsfield/media provider execution after reservation.",
    dryRun: "Build payload only; never call provider.",
    realProvider: "Higgsfield MCP/API later",
  },
};

export const SKILL_DOCS: SkillDoc[] = [
  {
    id: "read_project_context",
    category: "context",
    description: "Read project title, brief, duration, style, status and known constraints.",
    when: ["Every workflow start", "Before any creative or paid operation"],
    inputs: ["projectId", "userId"],
    outputs: ["projectContext"],
    keywords: ["project", "context", "brief", "style", "duration"],
    paid: false,
  },
  {
    id: "asset_resolver",
    category: "assets",
    description: "Resolve uploaded assets and @mentions into stable asset handles.",
    when: ["Prompt contains @mentions", "Film/avatar/product workflows need references"],
    inputs: ["prompt", "assets"],
    outputs: ["resolvedAssets"],
    keywords: ["asset", "upload", "mention", "character", "product", "avatar"],
    paid: false,
  },
  {
    id: "skill_rag_search",
    category: "rag",
    description: "Retrieve relevant skills and operating rules for an agent before it acts.",
    when: ["Every agent self-evaluation", "Workflow uses specialized tools"],
    inputs: ["agentId", "task", "workflowType"],
    outputs: ["recommendedSkills"],
    keywords: ["rag", "skill", "retrieve", "tools", "selection"],
    paid: false,
  },
  {
    id: "web_research_pack",
    category: "research",
    description: "Collect current market, trend or documentary research. Disabled until web runner is enabled.",
    when: ["Marketing trend research", "Documentary factual work", "Competitor/reference account analysis"],
    inputs: ["queries", "platform", "market"],
    outputs: ["researchPack"],
    keywords: ["trend", "market", "research", "competitor", "documentary", "current"],
    paid: true,
  },
  {
    id: "creative_model_call",
    category: "model",
    description: "Paid creative reasoning for scripts, hooks, prompts, scenes and storyboards.",
    when: ["Creative artifact is required", "Simple templates are not enough"],
    inputs: ["systemPrompt", "context", "outputSchema"],
    outputs: ["creativeArtifact"],
    keywords: ["script", "hook", "storyboard", "prompt", "creative", "campaign"],
    paid: true,
  },
  {
    id: "long_context_model_call",
    category: "model",
    description: "Paid long-context reasoning for heavy references, account analysis and documentary research.",
    when: ["Reference material is large", "Deep research or synthesis is needed"],
    inputs: ["contextBundle", "query", "schema"],
    outputs: ["longContextSummary"],
    keywords: ["long", "context", "reference", "documentary", "research"],
    paid: true,
  },
  {
    id: "multimodal_inspection",
    category: "model",
    description: "Paid multimodal inspection for images/videos/references and QA.",
    when: ["Asset visuals need validation", "Output consistency check is needed"],
    inputs: ["assetUrls", "criteria"],
    outputs: ["visualReport"],
    keywords: ["image", "video", "visual", "qa", "consistency", "avatar"],
    paid: true,
  },
  {
    id: "higgsfield_payload_builder",
    category: "provider",
    description: "Build Higgsfield-ready payloads for video/image/avatar/editor jobs. Does not submit.",
    when: ["Plan is ready for provider execution", "Storyboard or UGC jobs exist"],
    inputs: ["approvedPlan", "sceneData", "assets"],
    outputs: ["providerPayloads"],
    keywords: ["higgsfield", "video", "image", "avatar", "payload", "provider"],
    paid: false,
  },
  {
    id: "higgsfield_submit_job",
    category: "provider",
    description: "Submit a real provider job. Must be payment-gated and disabled in dry-run.",
    when: ["Credits are reserved", "User approved execution", "Provider credentials exist"],
    inputs: ["providerPayload", "reservationId"],
    outputs: ["providerJobId"],
    keywords: ["submit", "higgsfield", "execute", "generate"],
    paid: true,
  },
  {
    id: "qa_gate",
    category: "quality",
    description: "Check output against brief, style, assets, consistency and delivery readiness.",
    when: ["After any output", "Before delivery", "After regeneration"],
    inputs: ["output", "plan", "assets"],
    outputs: ["qaReport"],
    keywords: ["qa", "review", "quality", "delivery", "consistency"],
    paid: false,
  },
  {
    id: "delivery_assembler",
    category: "delivery",
    description: "Merge many branch outputs into one client-ready delivery pack.",
    when: ["All required branches complete", "Campaign or film pack is ready"],
    inputs: ["branchOutputs", "qaReport"],
    outputs: ["deliveryPack"],
    keywords: ["assemble", "delivery", "merge", "pack", "final"],
    paid: false,
  },
];

export const AGENTS: AgentDef[] = [
  { id: "mission_director", module: "core", lane: "director", purpose: "Understand the goal, choose workflow and supervise branches.", skills: ["read_project_context", "skill_rag_search"], paid: true, internet: false, output: ["missionBrief", "workflowChoice"] },
  { id: "workflow_router", module: "core", lane: "router", purpose: "Route the request to the right workflow and branch templates.", skills: ["skill_rag_search"], paid: false, internet: false, output: ["workflowType", "branches"] },
  { id: "context_builder", module: "core", lane: "deterministic", purpose: "Build compact context from project and request.", skills: ["read_project_context", "asset_resolver"], paid: false, internet: false, output: ["contextBundle"] },
  { id: "cost_estimator", module: "billing", lane: "deterministic", purpose: "Calculate estimate low/high and required reserve.", skills: ["skill_rag_search"], paid: false, internet: false, output: ["estimate"] },
  { id: "approval_gate", module: "billing", lane: "deterministic", purpose: "Block execution until credits and approval are valid.", skills: ["skill_rag_search"], paid: false, internet: false, output: ["gateResult"] },
  { id: "film_concept_brain", module: "film", lane: "creative", purpose: "Turn film brief into concept and visual direction.", skills: ["creative_model_call", "asset_resolver"], paid: true, internet: false, output: ["filmConcept"] },
  { id: "scene_planner", module: "film", lane: "creative", purpose: "Split the film into duration-aware scenes.", skills: ["creative_model_call"], paid: true, internet: false, output: ["scenePlan"] },
  { id: "storyboard_brain", module: "film", lane: "creative", purpose: "Create storyboard and frame direction.", skills: ["creative_model_call", "asset_resolver"], paid: true, internet: false, output: ["storyboard"] },
  { id: "higgsfield_payload_brain", module: "film", lane: "provider_execution", purpose: "Build provider payload drafts for Higgsfield.", skills: ["higgsfield_payload_builder", "higgsfield_submit_job"], paid: true, internet: false, output: ["providerPayloads"] },
  { id: "business_understanding_brain", module: "marketing", lane: "creative", purpose: "Understand business, offer, audience and objections.", skills: ["creative_model_call"], paid: true, internet: false, output: ["businessBrief"] },
  { id: "market_research_brain", module: "marketing", lane: "long_context", purpose: "Research market, competitors, trends and examples.", skills: ["web_research_pack", "long_context_model_call"], paid: true, internet: true, output: ["researchPack"] },
  { id: "viral_pattern_brain", module: "marketing", lane: "creative", purpose: "Extract why content works or fails.", skills: ["creative_model_call", "web_research_pack"], paid: true, internet: true, output: ["viralPatterns"] },
  { id: "campaign_planner", module: "marketing", lane: "creative", purpose: "Convert research into content plan and campaign jobs.", skills: ["creative_model_call"], paid: true, internet: false, output: ["campaignMap"] },
  { id: "ugc_script_brain", module: "marketing", lane: "creative", purpose: "Create UGC hooks, scripts, captions and CTA bundles.", skills: ["creative_model_call"], paid: true, internet: false, output: ["ugcScripts"] },
  { id: "documentary_research_brain", module: "documentary", lane: "long_context", purpose: "Build source-bound documentary research packs.", skills: ["web_research_pack", "long_context_model_call"], paid: true, internet: true, output: ["documentaryResearch"] },
  { id: "documentary_script_brain", module: "documentary", lane: "creative", purpose: "Write documentary script and beat structure.", skills: ["creative_model_call"], paid: true, internet: false, output: ["script", "beats"] },
  { id: "avatar_identity_brain", module: "avatar", lane: "multimodal", purpose: "Validate avatar inputs and create identity lock plan.", skills: ["multimodal_inspection", "asset_resolver"], paid: true, internet: false, output: ["avatarInputReport", "identityLock"] },
  { id: "service_operator_brain", module: "service", lane: "director", purpose: "Coordinate across platform tools and explain next actions.", skills: ["read_project_context", "skill_rag_search"], paid: true, internet: false, output: ["servicePlan"] },
  { id: "qa_brain", module: "qa", lane: "multimodal", purpose: "Check quality, consistency, risks and readiness.", skills: ["qa_gate", "multimodal_inspection"], paid: true, internet: false, output: ["qaReport"] },
  { id: "delivery_assembler", module: "delivery", lane: "deterministic", purpose: "Merge many outputs into one final client-ready package.", skills: ["delivery_assembler"], paid: false, internet: false, output: ["deliveryPack"] },
];

export const WORKFLOWS: Record<WorkflowType, string[]> = {
  film_maker: ["mission_director", "context_builder", "cost_estimator", "film_concept_brain", "scene_planner", "storyboard_brain", "higgsfield_payload_brain", "qa_brain", "delivery_assembler"],
  marketing_agent: ["mission_director", "context_builder", "cost_estimator", "business_understanding_brain", "market_research_brain", "viral_pattern_brain", "campaign_planner", "ugc_script_brain", "qa_brain", "delivery_assembler"],
  youtube_documentary: ["mission_director", "context_builder", "cost_estimator", "documentary_research_brain", "documentary_script_brain", "scene_planner", "higgsfield_payload_brain", "qa_brain", "delivery_assembler"],
  ugc_avatar: ["mission_director", "context_builder", "cost_estimator", "avatar_identity_brain", "ugc_script_brain", "higgsfield_payload_brain", "qa_brain", "delivery_assembler"],
  service_agent: ["mission_director", "context_builder", "cost_estimator", "service_operator_brain", "workflow_router", "qa_brain", "delivery_assembler"],
};

function normalizedWorkflow(type?: string): WorkflowType {
  if (type === "film_maker" || type === "film") return "film_maker";
  if (type === "marketing_agent" || type === "market" || type === "marketing") return "marketing_agent";
  if (type === "youtube_documentary" || type === "documentary") return "youtube_documentary";
  if (type === "ugc_avatar" || type === "avatar") return "ugc_avatar";
  return "service_agent";
}

function words(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9_@\u0600-\u06ff]+/gi, " ").split(/\s+/).filter(Boolean);
}

export function estimateOperation(input: OperationInput): OperationEstimate {
  const creditsPerUsd = 10;
  const duration = Math.max(5, Number(input.durationSeconds || 15));
  const quality = input.quality || "standard";
  const complexity = input.complexity || "normal";
  const researchMode = input.researchMode || "none";
  const variants = Math.max(1, Number(input.variants || 1));
  const assets = Math.max(0, Number(input.assetsCount || 0));
  const references = Math.max(0, Number(input.referencesCount || 0));
  const videoUnits15 = Math.ceil(duration / 15);

  const qualityUsd = quality === "premium" ? 7 : quality === "draft" ? 3.5 : 5;
  const complexityUsd = complexity === "deep" ? 4 : complexity === "light" ? 0.75 : 1.75;
  const researchUsd = researchMode === "deep" ? 5 : researchMode === "light" ? 1.5 : 0;
  const providerUsd = videoUnits15 * qualityUsd * variants;
  const agentUsd = complexityUsd + researchUsd + references * 0.35 + assets * 0.15;
  const systemUsd = Math.max(0.75, (providerUsd + agentUsd) * 0.12);
  const lowUsd = Math.max(2, (providerUsd + agentUsd + systemUsd) * 1.45);
  const highUsd = lowUsd * 1.22;

  const roundCredits = (usd: number) => Math.ceil((usd * creditsPerUsd) / 5) * 5;
  return {
    creditsPerUsd,
    estimatedLowCredits: roundCredits(lowUsd),
    estimatedHighCredits: roundCredits(highUsd),
    requiredCredits: roundCredits(highUsd),
    estimatedLowUsd: Number((roundCredits(lowUsd) / creditsPerUsd).toFixed(2)),
    estimatedHighUsd: Number((roundCredits(highUsd) / creditsPerUsd).toFixed(2)),
    explanation: "The platform reserves the high estimate before execution, then charges actual final cost and returns unused reserved credits.",
    internalBreakdown: { providerUsd, agentUsd, systemUsd, lowUsd, highUsd },
  };
}

export function ragSkills(query: string, agentId?: string, limit = 8): Array<SkillDoc & { score: number; matched: string[] }> {
  const agent = AGENTS.find(a => a.id === agentId);
  const q = new Set(words(`${query} ${agent?.purpose ?? ""} ${(agent?.skills ?? []).join(" ")}`));
  return SKILL_DOCS.map(doc => {
    const hay = words(`${doc.id} ${doc.category} ${doc.description} ${doc.keywords.join(" ")} ${doc.when.join(" ")}`);
    const matched = hay.filter(w => q.has(w));
    let score = matched.length * 10;
    if (agent?.skills.includes(doc.id)) score += 80;
    if (doc.paid && agent?.paid) score += 5;
    return { ...doc, score, matched: [...new Set(matched)] };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getAgentAttachment(agentId: string): AgentAttachment | undefined {
  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) return undefined;
  return {
    ...agent,
    promptPack: {
      system: [
        `You are ${agent.id}, an operational mind inside Content Machine.`,
        `Purpose: ${agent.purpose}`,
        "Operate as a specialist unit, not a general chatbot.",
        "Run self-evaluation before using any skill.",
        "Never call paid providers directly. Paid execution is gated by credit reservation and provider runners.",
        "Return structured JSON only when used by the backend runner.",
      ].join("\n"),
      inputContract: ["projectContext", "operationInput", "walletState", "previousBranchOutputs"],
      outputContract: ["status", "summary", "selectedSkills", "artifact", "handoff", "warnings"],
      guardrails: ["No direct provider calls", "No hidden spending", "No invented assets", "Mark missing information"],
    },
    ragSkills: ragSkills(agent.purpose, agent.id, 10),
    selfEvaluation: [
      "Do I have enough project context?",
      "Which allowed skills are actually needed?",
      "Is this preview, dry-run, or paid execution?",
      "What should I hand off to the next agent?",
    ],
  };
}

export function buildBranches(workflowType: WorkflowType): BranchSpec[] {
  if (workflowType === "marketing_agent") {
    return [
      { id: "understanding", title: "Business understanding", agents: ["business_understanding_brain"], dependsOn: ["context"], canRunInParallel: false },
      { id: "research", title: "Market and trend research", agents: ["market_research_brain", "viral_pattern_brain"], dependsOn: ["understanding"], canRunInParallel: true },
      { id: "campaign", title: "Campaign and UGC expansion", agents: ["campaign_planner", "ugc_script_brain"], dependsOn: ["research"], canRunInParallel: false },
      { id: "qa_delivery", title: "QA and delivery assembly", agents: ["qa_brain", "delivery_assembler"], dependsOn: ["campaign"], canRunInParallel: false },
    ];
  }
  if (workflowType === "film_maker") {
    return [
      { id: "concept", title: "Concept and scene structure", agents: ["film_concept_brain", "scene_planner"], dependsOn: ["context"], canRunInParallel: false },
      { id: "storyboard", title: "Storyboard and frame instructions", agents: ["storyboard_brain"], dependsOn: ["concept"], canRunInParallel: false },
      { id: "provider_payloads", title: "Higgsfield payload drafts", agents: ["higgsfield_payload_brain"], dependsOn: ["storyboard"], canRunInParallel: false },
      { id: "qa_delivery", title: "QA and final package", agents: ["qa_brain", "delivery_assembler"], dependsOn: ["provider_payloads"], canRunInParallel: false },
    ];
  }
  if (workflowType === "youtube_documentary") {
    return [
      { id: "research", title: "Documentary research", agents: ["documentary_research_brain"], dependsOn: ["context"], canRunInParallel: false },
      { id: "script", title: "Script and visual beats", agents: ["documentary_script_brain", "scene_planner"], dependsOn: ["research"], canRunInParallel: false },
      { id: "payloads", title: "Visual payload drafts", agents: ["higgsfield_payload_brain"], dependsOn: ["script"], canRunInParallel: false },
      { id: "qa_delivery", title: "QA and delivery assembly", agents: ["qa_brain", "delivery_assembler"], dependsOn: ["payloads"], canRunInParallel: false },
    ];
  }
  if (workflowType === "ugc_avatar") {
    return [
      { id: "identity", title: "Avatar identity lock", agents: ["avatar_identity_brain"], dependsOn: ["context"], canRunInParallel: false },
      { id: "ugc", title: "Avatar UGC scripts and payloads", agents: ["ugc_script_brain", "higgsfield_payload_brain"], dependsOn: ["identity"], canRunInParallel: false },
      { id: "qa_delivery", title: "QA and delivery assembly", agents: ["qa_brain", "delivery_assembler"], dependsOn: ["ugc"], canRunInParallel: false },
    ];
  }
  return [
    { id: "service", title: "Service coordination", agents: ["service_operator_brain", "workflow_router"], dependsOn: ["context"], canRunInParallel: false },
    { id: "qa_delivery", title: "QA and delivery assembly", agents: ["qa_brain", "delivery_assembler"], dependsOn: ["service"], canRunInParallel: false },
  ];
}

export function buildOperationalPlan(input: OperationInput): OperationalPlan {
  const workflowType = normalizedWorkflow(input.workflowType || input.serviceType);
  const agentIds = WORKFLOWS[workflowType];
  const estimate = estimateOperation(input);
  return {
    id: `plan_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    workflowType,
    prompt: input.prompt,
    estimate,
    agentPath: agentIds.map(id => getAgentAttachment(id)).filter(Boolean) as AgentAttachment[],
    branches: buildBranches(workflowType),
    aggregation: {
      aggregatorAgent: "delivery_assembler",
      deliverables: ["execution_plan", "branch_artifacts", "qa_report", "delivery_pack"],
      mergeRule: "Collect all branch outputs, run QA, then assemble one client-ready delivery pack.",
    },
    status: "dry_ready",
  };
}

function dryArtifact(agentId: string, branchId: string, plan: OperationalPlan, index: number) {
  const agent = AGENTS.find(a => a.id === agentId)!;
  const skills = ragSkills(`${plan.workflowType} ${plan.prompt} ${agent.purpose}`, agentId, 4).map(s => s.id);
  return {
    agentId,
    artifactType: agent.output[0] ?? "artifact",
    summary: `${agent.id} prepared ${agent.output.join(", ")} for branch ${branchId}. Dry-run only; no paid API was called.`,
    selectedSkills: skills,
    confidence: Number((0.72 + Math.min(0.2, index * 0.03)).toFixed(2)),
  };
}

export function runDryOperationalPlan(plan: OperationalPlan): DryRunResult {
  const branchOutputs = plan.branches.map((branch) => ({
    branchId: branch.id,
    title: branch.title,
    status: "completed_dry_run" as const,
    outputs: branch.agents.map((agentId, index) => dryArtifact(agentId, branch.id, plan, index)),
  }));

  return {
    plan: { ...plan, status: "dry_completed" },
    branches: branchOutputs,
    assembledDelivery: {
      status: "assembled_dry_run",
      summary: `Assembled ${branchOutputs.length} branches for ${plan.workflowType}. This proves orchestration, branching, RAG selection, and final packaging without paid calls.`,
      deliverables: plan.aggregation.deliverables,
      nextAction: "Wire estimate/reserve gate to real provider execution runner, then connect Higgsfield and model lanes one by one.",
    },
  };
}

export function getOperationalCatalog() {
  return {
    modelLanes: MODEL_LANES,
    skills: SKILL_DOCS,
    agents: AGENTS.map(a => getAgentAttachment(a.id)),
    workflows: Object.fromEntries(Object.keys(WORKFLOWS).map(k => [k, buildBranches(k as WorkflowType)])),
  };
}
