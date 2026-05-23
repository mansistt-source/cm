import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { pipelineRouter } from "./routers/pipeline";
import { authRouter } from "./routers/auth";
import { paypalRouter } from "./routers/paypal";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  paypal: paypalRouter,
  pipeline: pipelineRouter,
});

export type AppRouter = typeof appRouter;
