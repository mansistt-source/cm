import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { register, login, googleAuth } from "../services/auth";

export const authRouter = router({

  register: publicProcedure
    .input(z.object({
      email:    z.string().email(),
      password: z.string().min(8),
      name:     z.string().min(2),
    }))
    .mutation(async ({ input }) => {
      return register(input.email, input.password, input.name);
    }),

  login: publicProcedure
    .input(z.object({
      email:    z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      return login(input.email, input.password);
    }),

  googleLogin: publicProcedure
    .input(z.object({ credential: z.string() }))
    .mutation(async ({ input }) => {
      return googleAuth(input.credential);
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});
