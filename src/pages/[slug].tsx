import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { LoadingPage } from "~/compnents/loading";
import { api } from "~/utils/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const ProfileFeed = (props: {userId: string}) => {
  const {data, isLoading} = api.posts.getPostbyUserId.useQuery({
    userId: props.userId,
  });
  if (isLoading) return <LoadingPage />;

  if (!data || data.length === 0) return <div>User has not posted</div>;

  return <div>
    {data.map(fullpost => (<PostView {...fullpost} key={fullpost.post.id}></PostView>))}
  </div>
}

const SinglePostPage: NextPage<{ username: string }> = ({ username }) => {
  const { data, isLoading } = api.profile.getUserByUserName.useQuery({
    username,
  });

  if (isLoading) {
    console.log("loading");
  }

  if (!data) return <div>404</div>;

  console.log(data);
  return (
    <>
      <Head>
        <title>{data.username}</title>
      </Head>
      <PageLayout>
        <div className="relative h-48  bg-slate-600">
          <img
            src={data.profileImageUrl}
            alt={`${data.username ?? ""}'s profile pic`}
            style={{ width: "128px", height: "128px" }}
            className="absolute bottom-0 left-0 -mb-[64px] ml-4 rounded-full border-2 border-black"
          />
        </div>
        <div className="h-[64px]"></div>
        <div className="p-4 text-2xl">{`@${data.username}`}</div>
        <div className="w-full border-b border-slate-400"></div>
        <ProfileFeed userId={data.id} />
      </PageLayout>
    </>
  );
};

import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import superjson from "superjson";
import { PageLayout } from "~/compnents/layout";
import { PostView } from "~/compnents/postview";

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: { prisma, userId: null },
    transformer: superjson, // optional - adds superjson serialization
  });

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("no slug");

  const username = slug.replace("@", "");

  await ssg.profile.getUserByUserName.prefetch({ username });

  return {
    props: { trpcState: ssg.dehydrate(), username },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default SinglePostPage;
