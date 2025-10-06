import { ServiceImpl } from '@connectrpc/connect'
import { Service } from '../../../proto/bsky_connect'
import { Database } from '../db'
import { getAncestorsAndSelfQb, getDescendentsQb } from '../util'
import { isRecipeURI } from '../../../util'

export default (db: Database): Partial<ServiceImpl<typeof Service>> => ({
  async getThread(req) {
    // TODO: should quote posts be returned here?
    const { postUri, above, below } = req
    if (isRecipeURI(postUri)) {
      const uris = [postUri]

      const replies = await db.db
        .selectFrom('post')
        .select("uri")
        .where("replyParent", "=", postUri)
        .execute()

      const descs = await Promise.all(replies.map(({ uri }) => getDescendentsQb(db.db, {
        uri: postUri,
        depth: below - 1, // TODO: this ends up being 0
      })
        .selectFrom('descendent')
        .innerJoin('post', 'post.uri', 'descendent.uri')
        .orderBy('post.sortAt', 'desc')
        .selectAll()
        .execute()))

      uris.push(...replies.map(({ uri }) => uri), ...descs.flat().map(({ uri }) => uri))
      return {
        uris
      }
    }

    const [ancestors, descendents] = await Promise.all([
      getAncestorsAndSelfQb(db.db, {
        uri: postUri,
        parentHeight: above,
      })
        .selectFrom('ancestor')
        .selectAll()
        .execute(),
      getDescendentsQb(db.db, {
        uri: postUri,
        depth: below,
      })
        .selectFrom('descendent')
        .innerJoin('post', 'post.uri', 'descendent.uri')
        .orderBy('post.sortAt', 'desc')
        .selectAll()
        .execute(),
    ])
    const uris = [
      ...ancestors.map((p) => p.uri),
      ...descendents.map((p) => p.uri),
    ]
    return { uris }
  },
})
