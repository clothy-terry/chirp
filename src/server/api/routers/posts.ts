import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.post.findMany();
  }),

  create: privateProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input}) => {
      const authorId = ctx.currentUser.id;
      const post = await ctx.prisma.post.create({
        data: {
          userId: authorId,
          content: input.content
        }
      });

      return post;
    }),
});