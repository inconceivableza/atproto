import { Generated } from 'kysely'

export const tableName = 'rating_agg'

export interface RatingAgg {
  uri: string
  aspect: string
  ratingCount: Generated<number>
  ratingAverage: Generated<number>
}

export type PartialDB = {
  [tableName]: RatingAgg
}
