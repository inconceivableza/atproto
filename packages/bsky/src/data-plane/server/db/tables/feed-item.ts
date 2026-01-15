export const tableName = 'feed_item'

export interface FeedItem {
  uri: string
  cid: string
  type: 'post' | 'repost' | 'recipe' | 'review'
  postUri: string
  originatorDid: string
  sortAt: string
}

export type PartialDB = { [tableName]: FeedItem }
