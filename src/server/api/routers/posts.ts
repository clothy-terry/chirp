import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helper/filterUserForClient";
import { Post } from "@prisma/client";

const addUserDataToPosts = async (posts: Post[]) => {
  const users = (
    await clerkClient.users.getUserList({
      userId: posts.map((post) => post.userId),
      limit: 100,
    })
  ).map(filterUserForClient);

  return posts.map((post) => {
    const author = users.find((user) => user.id === post.userId);

    if (!author || !author.username)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Author for post not found",
      });

    return {
      post,
      author: {
        ...author,
        username: author.username,
      },
    };
  });
};

// Create a new ratelimiter, that allows 3 requests per 1 min
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const postsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
      });

      if (!post)
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

      return (await addUserDataToPosts([post]))[0];
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }],
    });

    return addUserDataToPosts(posts);
  }),

  getPostbyUserId: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      ctx.prisma.post
        .findMany({
          where: {
            userId: input.userId,
          },
          take: 100,
          orderBy: [{ createdAt: "desc" }],
        })
        .then(addUserDataToPosts)
    ),

  // Limit the format of post here
  create: privateProcedure
    .input(
      z.object({
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      const { success } = await ratelimit.limit(userId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

      const post = await ctx.prisma.post.create({
        data: {
          userId,
          content: input.content,
        },
      });

      return post;
    }),
});
