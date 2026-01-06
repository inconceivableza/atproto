import { Server } from '../../../../lexicon'
import { AppContext } from '../../../../context'
import { createPipeline } from '../../../../pipeline'
import { clearlyBadCursor, resHeaders } from '../../../util'
import { FeedItem } from '../../../../hydration/feed'
import { Views } from '../../../../views'
import { DataPlaneClient } from '../../../../data-plane'
import { parseString } from '../../../../hydration/util'

import {
  HydrateCtx,
  HydrationState,
  Hydrator,
} from '../../../../hydration/hydrator'
// TODO: switch if adding to lexicon
import { QueryParams } from '../../../../lexicon/types/app/bsky/feed/getTimeline'

export default function (server: Server, ctx: AppContext) {

}


export const skeleton = async (inputs: {
  ctx: Context
  params: Params
}): Promise<Skeleton> => {
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

