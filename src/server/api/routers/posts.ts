import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { User } from "@clerk/nextjs/dist/api";
import { TRPCError } from "@trpc/server";

const filtetUserForClient = (user: User) => {
  return {
    id: user.id,
    name: user.username,
    profilePicture: user.profileImageUrl,
  };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
    });

    const userList = await clerkClient.users.getUserList({
      userId: posts.map((post) => post.userId),
      limit: 100,
    });

    const users = userList.map(filtetUserForClient);

    console.log(users);

    return posts.map((post) => {
      const author = users.find((user) => user.id === post.userId);
      if (!author) throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: "Author for post not found"});

      return {
        post,
        author,
      };
    });
  }),
});