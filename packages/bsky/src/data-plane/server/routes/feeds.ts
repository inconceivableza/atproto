import { ServiceImpl } from '@connectrpc/connect'
import { Service } from '../../../proto/bsky_connect'
import { AuthorFeedItem, FeedItemType, FeedType } from '../../../proto/bsky_pb'
import { Database } from '../db'
import { TimeCidKeyset, paginate } from '../db/pagination'
import { Selectable, SelectQueryBuilder } from 'kysely'
import { DatabaseSchemaType } from '../db/database-schema'
import { PartialMessage } from '@bufbuild/protobuf'
import z from "zod"

export default (db: Database): Partial<ServiceImpl<typeof Service>> => ({
  async getAuthorFeed(req) {
    const { actorDid, limit, cursor, feedType } = req
    const { ref } = db.db.dynamic
    // defaults to posts, reposts, and replies
    let builder = db.db
      .selectFrom('feed_item')
      .leftJoin('post', 'post.uri', 'feed_item.postUri')
      .leftJoin('recipe_post', 'recipe_post.uri', 'feed_item.postUri')
      .leftJoin('review_rating', 'review_rating.uri', 'feed_item.postUri')
      .selectAll('feed_item')
      .where('originatorDid', '=', actorDid)

    if (feedType === FeedType.POSTS_WITH_MEDIA) {
      builder = builder
        // only your own posts
        .where('type', '=', 'post')
        // only posts with media
        .whereExists((qb) =>
          qb
            .selectFrom('post_embed_image')
            .select('post_embed_image.postUri')
            .whereRef('post_embed_image.postUri', '=', 'feed_item.postUri'),
        )
    } else if (feedType === FeedType.POSTS_WITH_VIDEO) {
      builder = builder
        // only your own posts
        .where('type', '=', 'post')
        // only posts with video
        .whereExists((qb) =>
          qb
            .selectFrom('post_embed_video')
            .select('post_embed_video.postUri')
            .whereRef('post_embed_video.postUri', '=', 'feed_item.postUri'),
        )
    } else if (feedType === FeedType.POSTS_NO_REPLIES) {
      builder = builder.where((qb) =>
        qb
          .where('feed_item.type', "!=", 'review')
          .where(eb => eb.where('post.replyParent', 'is', null)
            .orWhere('type', '=', 'repost')
          )
      )
    } else if (feedType === FeedType.POSTS_AND_AUTHOR_THREADS) {
      builder = builder.where((qb) =>
        qb
          .where(eb => eb.where('feed_item.type', "!=", 'review')
            .orWhere('review_rating.subject', 'like', `at://${actorDid}/%`)
          )
          // Bracket the conditions related to posts as the corresponding columns will
          // always be null resulting in false positives
          .where(eb => eb.where('type', '=', 'repost')
            .orWhere('post.replyParent', 'is', null)
            .orWhere('post.replyRoot', 'like', `at://${actorDid}/%`)
        )
      )
    }

    const keyset = new TimeCidKeyset(
      ref('feed_item.sortAt'),
      ref('feed_item.cid'),
    )
    builder = paginate(builder, {
      limit,
      cursor,
      keyset,
    })

    const feedItems = await builder.execute()

    return {
      items: feedItems.map(feedItemFromRow),
      cursor: keyset.packFromResult(feedItems),
    }
  },

  async getTimeline(req) {
    const { actorDid, limit, cursor, filter } = req
    const { ref } = db.db.dynamic

    const keyset = new TimeCidKeyset(
      ref('feed_item.sortAt'),
      ref('feed_item.cid'),
    )

    let followQb = addPostTypeFilter(filter, db.db
      .selectFrom('feed_item')
      .innerJoin('follow', 'follow.subjectDid', 'feed_item.originatorDid')
      .where('follow.creator', '=', actorDid)
      .selectAll('feed_item')
    )

    followQb = paginate(followQb, {
      limit,
      cursor,
      keyset,
      tryIndex: true,
    })

    let selfQb = addPostTypeFilter(filter, db.db
      .selectFrom('feed_item')
      .where('feed_item.originatorDid', '=', actorDid)
      .selectAll('feed_item')
    )

    selfQb = paginate(selfQb, {
      limit: Math.min(limit, 10),
      cursor,
      keyset,
      tryIndex: true,
    })

    const [followRes, selfRes] = await Promise.all([
      followQb.execute(),
      selfQb.execute(),
    ])

    const feedItems = [...followRes, ...selfRes]
      .sort((a, b) => {
        if (a.sortAt > b.sortAt) return -1
        if (a.sortAt < b.sortAt) return 1
        return a.cid > b.cid ? -1 : 1
      })
      .slice(0, limit)

    return {
      items: feedItems.map(feedItemFromRow),
      cursor: keyset.packFromResult(feedItems),
    }
  },

  async getListFeed(req) {
    // TODO add recipes
    const { listUri, cursor, limit } = req
    const { ref } = db.db.dynamic

    let builder = db.db
      .selectFrom('post')
      .selectAll('post')
      .innerJoin('list_item', 'list_item.subjectDid', 'post.creator')
      .where('list_item.listUri', '=', listUri)

    const keyset = new TimeCidKeyset(ref('post.sortAt'), ref('post.cid'))
    builder = paginate(builder, {
      limit,
      cursor,
      keyset,
      tryIndex: true,
    })
    const feedItems = await builder.execute()

    return {
      items: feedItems.map((item) => ({ uri: item.uri, cid: item.cid })),
      cursor: keyset.packFromResult(feedItems),
    }
  },

  async getEverythingFeed(req) {
    const { cursor, limit, filter } = req
    const { ref } = db.db.dynamic

    const keyset = new TimeCidKeyset(
      ref('feed_item.sortAt'),
      ref('feed_item.cid'),
    )

    const builder = addPostTypeFilter(filter, db.db
      .selectFrom('feed_item')
      .selectAll('feed_item')
    )

    const feedQb = paginate(builder, {
      limit,
      cursor,
      keyset,
      tryIndex: true
    })

    const feedItems = await feedQb.execute()

    return {
      items: feedItems.map(feedItemFromRow),
      cursor: keyset.packFromResult(feedItems)
    }
  },

  async getRecipesFeed(req) {
    const { cursor, limit } = req
    const { ref } = db.db.dynamic

    const keyset = new TimeCidKeyset(
      ref('feed_item.sortAt'),
      ref('feed_item.cid'),
    )

    let feedQb = paginate(db.db
      .selectFrom('feed_item')
      .select(['uri', 'cid', 'sortAt'])
      .where('feed_item.type', '=', "recipe"), {
      limit,
      cursor,
      keyset,
      tryIndex: true
    })
    const feedItems = await feedQb.execute()

    return {
      items: feedItems,
      cursor: keyset.packFromResult(feedItems)
    }
  }
})

// @NOTE does not support additional fields in the protos specific to author feeds
// and timelines. at the time of writing, hydration/view implementations do not rely on them.
const feedItemFromRow = (row: Selectable<DatabaseSchemaType['feed_item']>): PartialMessage<AuthorFeedItem> => {
  return {
    uri: row.postUri,
    repost: row.uri === row.postUri ? undefined : row.uri,
    itemType: feedItemType(row.type)
  }
}

function feedItemType(value: string): FeedItemType {
  switch (value) {
    case 'post':
      return FeedItemType.POST
    case 'repost':
      return FeedItemType.REPOST
    case 'recipe':
      return FeedItemType.RECIPE
    case 'review':
      return FeedItemType.REVIEW_RATING
  }
  return FeedItemType.UNSPECIFIED
}

const filterSchema = z.enum(["all", "post", "recipe", "review"])

function addPostTypeFilter<O>(filter: string, qb: SelectQueryBuilder<DatabaseSchemaType, "feed_item", O>) {
  const parsedFilter = filterSchema.safeParse(filter)
  if (parsedFilter.error || parsedFilter.data === "all") {
    return qb
  }
  return qb.innerJoin("feed_item as subject", "feed_item.postUri", "subject.uri")
    .where(eb =>
      //@ts-ignore lambda expression isn't aware of above type refinement (filtering out "all")                                                                                                                           
      eb.where("feed_item.type", "=", parsedFilter.data)
        .orWhere(eb2 =>
          eb2.where("feed_item.type", "=", "repost")
            //@ts-ignore                                                                                       
            .where("subject.type", "=", parsedFilter.data)
        )
    )
}