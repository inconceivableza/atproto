import { Server } from '../../../../lexicon'
import { AppContext } from '../../../../context'
import { createPipeline } from '../../../../pipeline'
import { clearlyBadCursor, resHeaders } from '../../../util'
import { FeedItem } from '../../../../hydration/feed'
import { Views } from '../../../../views'
import { DataPlaneClient } from '../../../../data-plane'
import { parseString } from '../../../../hydration/util'
import { QueryParams } from '../../../../lexicon/types/app/foodios/feed/getTimeline'
import { skeleton as bskyTimelineSkeleton } from '../../bsky/feed/getTimeline'
import {
  HydrateCtx,
  HydrationState,
  Hydrator,
} from '../../../../hydration/hydrator'
import { mapDefined } from '@atproto/common'
import { InvalidRequestError } from '@atproto/xrpc-server'

export default function (server: Server, ctx: AppContext) {
  
  const getTimeline = createPipeline(
    skeleton,
    hydration,
    noBlocksOrMutes,
    presentation,
  )
  server.app.foodios.feed.getTimeline({
    auth: ctx.authVerifier.standard,
    handler: async ({ params, auth, req }) => {
      const viewer = auth.credentials.iss
      const labelers = ctx.reqLabelers(req)
      const hydrateCtx = await ctx.hydrator.createContext({ labelers, viewer })

      const result = await getTimeline(
        { ...params, hydrateCtx: hydrateCtx.copy({ viewer }) },
        ctx,
      )

      const repoRev = await ctx.hydrator.actor.getRepoRevSafe(viewer)

      return {
        encoding: 'application/json',
        body: result,
        headers: resHeaders({ labelers: hydrateCtx.labelers, repoRev }),
      }
    },
  })
}

const skeleton: SkeletonFn = (inputs) => {
  const timelineFn = skeletons[inputs.params.id]
  if (!timelineFn) {
    throw new InvalidRequestError('Invalid timeline id')
  }
  return timelineFn(inputs)
}

export const everythingSkeleton: SkeletonFn = async (inputs) => {
  const { ctx, params } = inputs
  if (clearlyBadCursor(params.cursor)) {
    return { items: [] }
  }
  const res = await ctx.dataplane.getEverythingFeed({
    limit: params.limit,
    cursor: params.cursor,
  })
  return {
    items: res.items.map((item) => ({
      itemType: item.itemType,
      post: { uri: item.uri, cid: item.cid || undefined },
      repost: item.repost
        ? { uri: item.repost, cid: item.repostCid || undefined }
        : undefined,
    })),
    cursor: parseString(res.cursor),
  }
}

const skeletons: Record<string, SkeletonFn> = {
  following: async ({ctx, params: {hydrateCtx,limit,cursor}}) => {
    return bskyTimelineSkeleton({ctx, params: {hydrateCtx, limit,cursor}})
  },
  everything: everythingSkeleton
}


type Context = {
  hydrator: Hydrator
  views: Views
  dataplane: DataPlaneClient
}

type Params = QueryParams & { hydrateCtx: HydrateCtx & { viewer: string } }

type Skeleton = {
  items: FeedItem[]
  cursor?: string
}

export type SkeletonFn = (inputs: {
  ctx: Context
  params: Params
}) => Promise<Skeleton>

const hydration = async (inputs: {
  ctx: Context
  params: Params
  skeleton: Skeleton
}): Promise<HydrationState> => {
  const { ctx, params, skeleton } = inputs
  return ctx.hydrator.hydrateFeedItems(skeleton.items, params.hydrateCtx)
}

const noBlocksOrMutes = (inputs: {
  ctx: Context
  skeleton: Skeleton
  hydration: HydrationState
}): Skeleton => {
  const { ctx, skeleton, hydration } = inputs
  skeleton.items = skeleton.items.filter((item) => {
    const bam = ctx.views.feedItemBlocksAndMutes(item, hydration)
    return (
      !bam.authorBlocked &&
      !bam.authorMuted &&
      !bam.originatorBlocked &&
      !bam.originatorMuted &&
      !bam.ancestorAuthorBlocked
    )
  })
  return skeleton
}

const presentation = (inputs: {
  ctx: Context
  skeleton: Skeleton
  hydration: HydrationState
}) => {
  const { ctx, skeleton, hydration } = inputs
  const feed = mapDefined(skeleton.items, (item) =>
    ctx.views.feedViewPostUnion(item, hydration),
  )
  return { feed, cursor: skeleton.cursor }
}


