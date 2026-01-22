import { FeedItem } from '../../../../hydration/feed'
import { Views } from '../../../../views'
import { DataPlaneClient } from '../../../../data-plane'
import { parseString } from '../../../../hydration/util'
import { QueryParams } from '../../../../lexicon/types/app/foodios/feed/getEverythingFeed'
import {
  HydrateCtx,
  HydrationState,
  Hydrator,
} from '../../../../hydration/hydrator'
import { mapDefined } from '@atproto/common'
import { GetTimelineResponse } from '../../../../proto/bsky_pb'
import { createPipeline } from '../../../../pipeline'
import { clearlyBadCursor } from '../../../util'

/**
 * Common definitions used across timeline i.e. everything and following feeds
 */

type Context = {
  hydrator: Hydrator
  views: Views
  dataplane: DataPlaneClient
}

type Params = QueryParams & { hydrateCtx: HydrateCtx & { viewer: string | null } }

type Skeleton = {
  items: FeedItem[]
  cursor?: string
}

export type SkeletonFn = (inputs: {
  ctx: Context
  params: Params
}) => Promise<Skeleton>

type TimelineFn = (inputs: {
  ctx: Context
  params: Params
}) => Promise<GetTimelineResponse>

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

export function createTimelinePipeline(timelineFn: TimelineFn) {
    
    const skeleton: SkeletonFn = async (inputs) => {
      const { params } = inputs
      if (clearlyBadCursor(params.cursor)) {
        return { items: [] }
      }
      
      const res = await timelineFn(inputs)
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

    return createPipeline(
        skeleton,
        hydration,
        noBlocksOrMutes,
        presentation,
    )
}