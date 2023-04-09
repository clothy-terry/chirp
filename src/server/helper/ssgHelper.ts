import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import superjson from "superjson";
import { PageLayout } from "~/compnents/layout";
import Image from "next/image";
import { LoadingPage } from "~/compnents/loading";
import { PostView } from "~/compnents/postview";

export const generateSSGHelper = () => 
  createProxySSGHelpers({
    router: appRouter,
    ctx: { prisma, userId: null },
    transformer: superjson, // optional - adds superjson serialization
  });