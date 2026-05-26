import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc.js";
import { getProjectById, logPipelineEvent } from "../db.js";
import {
  buildOperationalPlan,
  getAgentAttachment,
  getOperationalCatalog,
  ragSkills,
  runDryOperationalPlan,
} from "../services/operationalMinds.js";

const operationInputSchema = z.object({
  workflowType: z.enum(["film_maker", "marketing_agent", "youtube_documentary", "ugc_avatar", "service_agent"]).optional(),
  serviceType: z.string().optional(),
  prompt: z.string().min(3),
  durationSeconds: z.number().int().min(5).max(3600).optional(),
  quality: z.enum(["draft", "standard", "premium"]).optional(),
  complexity: z.enum(["light", "normal", "deep"]).optional(),
  researchMode: z.enum(["none", "light", "deep"]).optional(),
  assetsCount: z.number().int().min(0).max(100).optional(),
  referencesCount: z.number().int().min(0).max(100).optional(),
  variants: z.number().int().min(1).max(50).optional(),
});

export const operationalRouter = router({
  catalog: publicProcedure.query(() => getOperationalCatalog()),

  agentAttachment: publicProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .query(({ input }) => {
      const attachment = getAgentAttachment(input.agentId);
      if (!attachment) throw new Error("Agent not found");
      return attachment;
    }),

  skillRag: publicProcedure
    .input(z.object({ query: z.string().min(1), agentId: z.string().optional(), limit: z.number().int().min(1).max(20).optional() }))
    .query(({ input }) => ragSkills(input.query, input.agentId, input.limit ?? 8)),

  preview: protectedProcedure
    .input(operationInputSchema)
    .mutation(({ input }) => {
      const plan = buildOperationalPlan(input);
      return {
        plan,
        canRunDry: true,
        canRunPaid: false,
        note: "Preview only. No paid AI/provider call has been made.",
      };
    }),

  previewProject: protectedProcedure
    .input(z.object({ projectId: z.number().int(), operation: operationInputSchema.partial().optional() }))
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.projectId);
      if (!project || project.userId !== ctx.user.id) throw new Error("Project not found");
      const plan = buildOperationalPlan({
        workflowType: (input.operation?.workflowType as any) ?? (project.genre === "marketing" ? "marketing_agent" : "film_maker"),
        serviceType: input.operation?.serviceType ?? project.genre,
        prompt: input.operation?.prompt ?? project.initialPrompt,
        durationSeconds: input.operation?.durationSeconds ?? project.videoLength,
        quality: input.operation?.quality ?? "standard",
        complexity: input.operation?.complexity ?? "normal",
        researchMode: input.operation?.researchMode ?? "none",
        assetsCount: input.operation?.assetsCount ?? 0,
        referencesCount: input.operation?.referencesCount ?? 0,
        variants: input.operation?.variants ?? 1,
      });
      await logPipelineEvent(project.id, "operational_preview_created", "operational_minds", `Operational preview created for ${plan.workflowType}`, {
        estimate: plan.estimate,
        branches: plan.branches.length,
        agents: plan.agentPath.length,
      });
      return { project, plan, canRunDry: true, canRunPaid: false };
    }),

  runDry: protectedProcedure
    .input(operationInputSchema)
    .mutation(({ input }) => {
      const plan = buildOperationalPlan(input);
      return runDryOperationalPlan(plan);
    }),

  runProjectDry: protectedProcedure
    .input(z.object({ projectId: z.number().int(), operation: operationInputSchema.partial().optional() }))
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.projectId);
      if (!project || project.userId !== ctx.user.id) throw new Error("Project not found");
      const plan = buildOperationalPlan({
        workflowType: (input.operation?.workflowType as any) ?? (project.genre === "marketing" ? "marketing_agent" : "film_maker"),
        serviceType: input.operation?.serviceType ?? project.genre,
        prompt: input.operation?.prompt ?? project.initialPrompt,
        durationSeconds: input.operation?.durationSeconds ?? project.videoLength,
        quality: input.operation?.quality ?? "standard",
        complexity: input.operation?.complexity ?? "normal",
        researchMode: input.operation?.researchMode ?? "none",
        assetsCount: input.operation?.assetsCount ?? 0,
        referencesCount: input.operation?.referencesCount ?? 0,
        variants: input.operation?.variants ?? 1,
      });
      const result = runDryOperationalPlan(plan);
      await logPipelineEvent(project.id, "operational_dry_run_completed", "operational_minds", `Dry-run completed for ${plan.workflowType}`, {
        estimate: plan.estimate,
        branches: result.branches.length,
        outputs: result.branches.reduce((sum, branch) => sum + branch.outputs.length, 0),
      });
      return { project, ...result };
    }),
});
