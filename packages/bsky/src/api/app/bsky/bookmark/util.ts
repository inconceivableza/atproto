import { AtUri } from '@atproto/syntax'
import { InvalidRequestError } from '@atproto/xrpc-server'
import { ids } from '../../../../lexicon/lexicons'

const validCollections = new Set<string>([ids.AppBskyFeedPost, ids.AppFoodiosFeedRecipePost, ids.AppFoodiosFeedReviewRating])

export const validateUri = (uri: string) => {
  const atUri = new AtUri(uri)
  if (!validCollections.has(atUri.collection)) {
    throw new InvalidRequestError(
      `Unsupported record type`,
      'UnsupportedCollection',
    )
  }
}
