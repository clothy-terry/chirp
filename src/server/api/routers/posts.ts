import clerkClient from "@clerk/clerk-sdk-node";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
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
      if (!author){
        return {
          post,
          author: {
            
            username: "undefine"
          },
        };
      };
        

      return {
        post,
        author: {
          ...author,
          username: author.name,
        },
      };
    });
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