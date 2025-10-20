import { ServiceImpl } from '@connectrpc/connect'
import { Service } from '../../../proto/bsky_connect'
import { isRecipeURI, isReviewRatingURI } from '../../../util'
import { Database } from '../db'
import { getAncestorsAndSelfQb, getDescendentsQb } from '../util'

export default (db: Database): Partial<ServiceImpl<typeof Service>> => ({
  async getThread(req) {
    // TODO: should quote posts be returned here?
    const { postUri, above, below } = req
    if (isReviewRatingURI(postUri)) {
      const uris = [postUri]
      // the recipe this is a review of
      const recordsReviewed = await db.db
        .selectFrom('recipe_head_revision')
        .innerJoin(
          'review_rating',
          'recipe_head_revision.recipePostUri',
          'review_rating.subject',
        )
        .select('recipe_head_revision.recipePostUri')
        .where('review_rating.uri', '=', postUri)
        .execute()

      if (recordsReviewed.length > 0) {
        // other replies to the same subject
        const descs = await Promise.all(
          recordsReviewed.map(({ recipePostUri }) =>
            getDescendentsQb(db.db, {
              uri: recipePostUri,
              depth: below - 1, // TODO: this ends up being 0
            })
              .selectFrom('descendent')
              .innerJoin('post', 'post.uri', 'descendent.uri')
              .orderBy('post.sortAt', 'desc')
              .selectAll()
              .execute(),
          ),
        )

        // and other reviews of the same subject
        const otherReviews = await db.db
          .selectFrom('review_rating')
          .select('uri')
          .where(
            'subject',
            'in',
            recordsReviewed.map(({ recipePostUri }) => recipePostUri),
          )
          .where('uri', '!=', postUri)
          .execute()

        uris.push(
          ...recordsReviewed.map(({ recipePostUri }) => recipePostUri),
          ...descs.flat().map(({ uri }) => uri),
          ...otherReviews.map(({ uri }) => uri),
        )
      }
      return {
        uris,
      }
    }
    if (isRecipeURI(postUri)) {
      const uris = [postUri]

      const replies = await db.db
        .selectFrom('post')
        .select('uri')
        .where('replyParent', '=', postUri)
        .execute()

      const descs = await Promise.all(
        replies.map(({ uri }) =>
          getDescendentsQb(db.db, {
            uri,
            depth: below - 1, // TODO: this ends up being 0
          })
            .selectFrom('descendent')
            .innerJoin('post', 'post.uri', 'descendent.uri')
            .orderBy('post.sortAt', 'desc')
            .selectAll()
            .execute(),
        ),
      )

      // and reviews of the recipe
      const reviews = await db.db
        .selectFrom('review_rating')
        .select('uri')
        .where('subject', '=', postUri)
        .execute()

      uris.push(
        ...replies.map(({ uri }) => uri),
        ...descs.flat().map(({ uri }) => uri),
        ...reviews.map(({ uri }) => uri),
      )
      return {
        uris,
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
