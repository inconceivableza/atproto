import { AtpAgent } from '@atproto/api'
import { mapDefined } from '@atproto/common'
import { AppContext } from '../../../../context'
import { DataPlaneClient } from '../../../../data-plane'
import { HydrateCtx, Hydrator, mergeManyStates, mergeStates } from '../../../../hydration/hydrator'
import { parseString, urisByCollection } from '../../../../hydration/util'
import { Server } from '../../../../lexicon'
import { ids } from '../../../../lexicon/lexicons'
import { QueryParams } from '../../../../lexicon/types/app/bsky/feed/searchPosts'
import {
  HydrationFnInput,
  PresentationFnInput,
  RulesFnInput,
  SkeletonFnInput,
  createPipeline,
} from '../../../../pipeline'
import { uriToDid as creatorFromUri } from '../../../../util/uris'
import { Views } from '../../../../views'
import { resHeaders } from '../../../util'

export default function (server: Server, ctx: AppContext) {
  const searchPosts = createPipeline(
    skeleton,
    hydration,
    noBlocks,
    presentation,
  )
  server.app.bsky.feed.searchPosts({
    auth: ctx.authVerifier.standardOptional,
    handler: async ({ auth, params, req }) => {
      const viewer = auth.credentials.iss
      const labelers = ctx.reqLabelers(req)
      const hydrateCtx = await ctx.hydrator.createContext({ labelers, viewer })
      const results = await searchPosts({ ...params, hydrateCtx }, ctx)
      return {
        encoding: 'application/json',
        body: results,
        headers: resHeaders({ labelers: hydrateCtx.labelers }),
      }
    },
  })
}

const skeleton = async (inputs: SkeletonFnInput<Context, Params>) => {
  const { ctx, params } = inputs

  if (ctx.searchAgent) {
    // @NOTE cursors won't change on appview swap
    const { data: res } =
      await ctx.searchAgent.api.app.bsky.unspecced.searchPostsSkeleton({
        q: params.q,
        cursor: params.cursor,
        limit: params.limit,
        author: params.author,
        domain: params.domain,
        lang: params.lang,
        mentions: params.mentions,
        since: params.since,
        sort: params.sort,
        tag: params.tag,
        until: params.until,
        url: params.url,
        viewer: params.hydrateCtx.viewer ?? undefined,
      })
    return {
      posts: res.posts.map(({ uri }) => uri),
      cursor: parseString(res.cursor),
    }
  }

  const res = await ctx.dataplane.searchPosts({
    term: params.q,
    limit: params.limit,
    cursor: params.cursor,
  })
  return {
    posts: res.uris,
    cursor: parseString(res.cursor),
  }
}

const hydration = async (
  inputs: HydrationFnInput<Context, Params, Skeleton>,
) => {
  const { ctx, params, skeleton } = inputs
  const byCollection = urisByCollection(skeleton.posts)
  const states = await Promise.all([
    await ctx.hydrator.hydrateRecipes(
      byCollection.get(ids.AppFoodiosFeedRecipePost) ?? [],
      params.hydrateCtx
    ),
    await ctx.hydrator.hydrateReviewRatings(
      byCollection.get(ids.AppFoodiosFeedReviewRating) ?? [],
      params.hydrateCtx
    ),
    await ctx.hydrator.hydratePosts(
      byCollection.get(ids.AppBskyFeedPost)?.map(uri => ({ uri })) ?? [],
      params.hydrateCtx
    ),
  ])
  return mergeManyStates(...states)
}

const noBlocks = (inputs: RulesFnInput<Context, Params, Skeleton>) => {
  const { ctx, skeleton, hydration } = inputs
  skeleton.posts = skeleton.posts.filter((uri) => {
    const creator = creatorFromUri(uri)
    return !ctx.views.viewerBlockExists(creator, hydration)
  })
  return skeleton
}

const presentation = (
  inputs: PresentationFnInput<Context, Params, Skeleton>,
) => {
  const { ctx, skeleton, hydration } = inputs
  const posts = mapDefined(skeleton.posts, (uri) =>
    ctx.views.post(uri, hydration),
  )
  return {
    posts,
    cursor: skeleton.cursor,
    hitsTotal: skeleton.hitsTotal,
  }
}

type Context = {
  dataplane: DataPlaneClient
  hydrator: Hydrator
  views: Views
  searchAgent?: AtpAgent
}

type Params = QueryParams & { hydrateCtx: HydrateCtx }

type Skeleton = {
  posts: string[]
  hitsTotal?: number
  cursor?: string
}
