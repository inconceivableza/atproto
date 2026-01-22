import { Server } from '../../../../lexicon'
import { AppContext } from '../../../../context'
import { resHeaders } from '../../../util'
import { AuthRequiredError } from '@atproto/xrpc-server'
import { createTimelinePipeline } from './common'

export default function (server: Server, ctx: AppContext) {
  
  const getFeed = createTimelinePipeline(({ params, ctx }) => {
    if (!params.hydrateCtx.viewer) {
      throw new AuthRequiredError()
    }
    return ctx.dataplane.getTimeline({
      actorDid: params.hydrateCtx.viewer,
      limit: params.limit,
      cursor: params.cursor,
      filter: params.filter
    })
  })

  server.app.foodios.feed.getFollowingFeed({
    auth: ctx.authVerifier.standard,
    handler: async ({ params, auth, req }) => {
      const viewer = auth.credentials.iss
      const labelers = ctx.reqLabelers(req)
      const hydrateCtx = await ctx.hydrator.createContext({ labelers, viewer })

      const result = await getFeed(
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