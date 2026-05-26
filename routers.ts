import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { pipelineRouter } from "./routers/pipeline";
import { authRouter } from "./routers/auth";
import { paypalRouter } from "./routers/paypal";
import { operationalRouter } from "./routers/operational";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  paypal: paypalRouter,
  pipeline: pipelineRouter,
  operational: operationalRouter,
});

export type AppRouter = typeof appRouter;
