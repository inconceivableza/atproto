import { GeneratedAlways } from 'kysely'

const reviewRatingTableName = 'review_rating'

// post has a separate post-embed, but recipe-post doesn't. should review-rating?

export interface ReviewRating {
  uri: string
  cid: string
  creator: string
  subject: string
  subjectCid: string
  // currently all reviews are of recipies. If this is varied, we should introduce a subjectCollection field
  reviewRating: number
  reviewBody: string | null
  createdAt: string
  indexedAt: string
  sortAt: GeneratedAlways<string>
}

export type PartialDB = {
  [reviewRatingTableName]: ReviewRating
}
