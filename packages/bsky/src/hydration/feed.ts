import { dedupeStrs } from '@atproto/common'
import { DataPlaneClient } from '../data-plane/client'
import { Record as FeedGenRecord } from '../lexicon/types/app/bsky/feed/generator'
import { Record as LikeRecord } from '../lexicon/types/app/bsky/feed/like'
import { Record as PostRecord } from '../lexicon/types/app/bsky/feed/post'
import { Record as PostgateRecord } from '../lexicon/types/app/bsky/feed/postgate'
import { Record as RepostRecord } from '../lexicon/types/app/bsky/feed/repost'
import { Record as ThreadgateRecord } from '../lexicon/types/app/bsky/feed/threadgate'
import { Record as RecipeRecord } from '../lexicon/types/app/foodios/feed/recipePost'
import { Record as RecipeRevisionRecord } from '../lexicon/types/app/foodios/feed/recipeRevision'
import { Record as ReviewRatingRecord } from '../lexicon/types/app/foodios/feed/reviewRating'
import {
  postUriToPostgateUri,
  postUriToThreadgateUri,
  uriToDid as didFromUri,
} from '../util/uris'
import {
  HydrationMap,
  ItemRef,
  RecordInfo,
  isValidRecord,
  parseJsonBytes,
  parseRecord,
  parseRecordBytes,
  parseString,
  split,
} from './util'
import { FeedItemType } from '../proto/bsky_pb'
import { jsonToLex, lexicons, stripSearchParams } from '@atproto/api'
import { hydrationLogger } from '../logger'

export type Post = RecordInfo<PostRecord> & {
  violatesThreadGate: boolean
  violatesEmbeddingRules: boolean
  hasThreadGate: boolean
  hasPostGate: boolean
  tags: Set<string>
  /**
   * Debug information for internal development
   */
  debug?: {
    tags?: string[]
    [key: string]: unknown
  }
}
export type Posts = HydrationMap<Post>

export type PostViewerState = {
  like?: string
  repost?: string
  bookmarked?: boolean
  threadMuted?: boolean
}

export type PostViewerStates = HydrationMap<PostViewerState>

export type ThreadContext = {
  // Whether the root author has liked the post.
  like?: string
}

export type ThreadContexts = HydrationMap<ThreadContext>

export type PostAgg = {
  likes: number
  replies: number
  reposts: number
  quotes: number
  bookmarks: number
  ratingCount: number | null
  ratingAverage: number | null
  reviewCount: number | null
}

export type PostAggs = HydrationMap<PostAgg>

export type Like = RecordInfo<LikeRecord>
export type Likes = HydrationMap<Like>

export type Repost = RecordInfo<RepostRecord>
export type Reposts = HydrationMap<Repost>

export type FeedGenAgg = {
  likes: number
}

export type FeedGenAggs = HydrationMap<FeedGenAgg>

export type FeedGen = RecordInfo<FeedGenRecord>
export type FeedGens = HydrationMap<FeedGen>

export type FeedGenViewerState = {
  like?: string
}

export type FeedGenViewerStates = HydrationMap<FeedGenViewerState>

export type Threadgate = RecordInfo<ThreadgateRecord>
export type Threadgates = HydrationMap<Threadgate>
export type Postgate = RecordInfo<PostgateRecord>
export type Postgates = HydrationMap<Postgate>


export type RecipeRevision = RecordInfo<RecipeRevisionRecord> & { uri: string }
export type Recipe = RecordInfo<RecipeRecord> & {
  revisions: RecipeRevision[]
}
export type Recipes = HydrationMap<Recipe>
export type ReviewRating = RecordInfo<ReviewRatingRecord> & {
  violatesThreadGate: boolean
  violatesEmbeddingRules: boolean
  hasThreadGate: boolean
  hasPostGate: boolean
  tags: Set<string>
}
export type ReviewRatings = HydrationMap<ReviewRating>

export type ThreadRef = ItemRef & { threadRoot: string }

// @NOTE the feed item types in the protos for author feeds and timelines
// technically have additional fields, not supported by the mock dataplane.
export type FeedItem = {
  post: ItemRef
  repost?: ItemRef
  /**
   * If true, overrides the `reason` with `app.bsky.feed.defs#reasonPin`. Used
   * only in author feeds.
   */
  authorPinned?: boolean
  itemType: FeedItemType
}

export type GetPostsHydrationOptions = {
  processDynamicTagsForView?: 'thread' | 'search'
}

export class FeedHydrator {
  constructor(public dataplane: DataPlaneClient) { }

  async getRecipes(uris: string[], includeTakedowns = false, existing?: Recipes): Promise<Recipes> {
    // TODO: pass in existing state to avoid duplicate fetches
    // TODO: consider branding recipe URIs
    const result = new HydrationMap<Recipe>(existing)
    const required = uris.filter(uri => !result.has(stripSearchParams(uri)))

    const { records } = await this.dataplane.getRecipeRecords({ uris: required.map(stripSearchParams) })


    records.forEach(item => {
      if (!item.recordInfo) {
        return
      }
      const recipeRecord = parseRecordBytes<RecipeRecord>(item.record)
      if (!(recipeRecord && isValidRecord(recipeRecord))) {
        return
      }
      const revisions: RecipeRevision[] = item.revisions.flatMap(({ record, recordInfo }) => {
        const revisionRecord = parseRecordBytes<RecipeRevisionRecord>(record)

        if (!(revisionRecord && recordInfo && isValidRecord(revisionRecord))) {
          return []
        }
        return [{
          cid: recordInfo.cid,
          indexedAt: recordInfo.indexedAt?.toDate() ?? new Date(0),
          sortedAt: recordInfo.sortedAt?.toDate() ?? new Date(0),
          takedownRef: recordInfo.takedownRef,
          uri: recordInfo.uri,
          record: revisionRecord
        }]
      })

      result.set(item.recordInfo.uri, {
        cid: item.recordInfo.cid,
        indexedAt: item.recordInfo.indexedAt?.toDate() ?? new Date(0),
        sortedAt: item.recordInfo.sortedAt?.toDate() ?? new Date(0),
        takedownRef: item.recordInfo.takedownRef,
        record: recipeRecord,
        revisions
      })
    })

    return result
  }

  async getReviewRatings(
    uris: string[],
    includeTakedowns = false,
    given = new HydrationMap<ReviewRating>(),
  ): Promise<ReviewRatings> {
    const [have, need] = split(uris, (uri) => given.has(uri))
    const base = have.reduce(
      (acc, uri) => acc.set(uri, given.get(uri) ?? null),
      new HydrationMap<ReviewRating>(),
    )
    if (!need.length) return base

    const res = await this.dataplane.getReviewRatingRecords({ uris: need })
    return need.reduce((acc, uri, i) => {
      const item = res.records[i]
      hydrationLogger.info({ item }, 'Processing review rating item')
      if (!item.record) {
        hydrationLogger.warn({ item }, 'Missing record for review rating')
        return acc.set(uri, null)
      }
      const record = parseRecord<ReviewRatingRecord>(item, includeTakedowns)
      hydrationLogger.info({ record }, "record")
      if (!record) {
        const jsonRecord = parseJsonBytes(item.record)
        const parsedRecord = parseRecordBytes<ReviewRatingRecord>(item.record)
        const lexRecord = jsonToLex(jsonRecord)
        hydrationLogger.warn({ item, record, jsonRecord, parsedRecord, lexRecord }, 'Invalid review rating record')
        if (typeof lexRecord?.['$type'] !== 'string') {
          hydrationLogger.warn({ lexRecord }, 'type is not string')
        }
        try {
          lexicons.assertValidRecord(lexRecord!['$type'], lexRecord)
        } catch (e) {
          hydrationLogger.warn({ lexRecord, e }, 'validation error')
          return acc.set(uri, null)
        }
        hydrationLogger.warn({ lexRecord, jsonRecord, record }, 'Weirdly, isValidRecord failed but assertValidRecord succeeded')
        return acc.set(uri, null)
      }
      const tags = new Set<string>(item.tags ?? [])
      const reviewRating: ReviewRating = {
        ...record,
        cid: item.cid,
        indexedAt: item.indexedAt?.toDate() ?? new Date(0),
        sortedAt: item.sortedAt?.toDate() ?? new Date(0),
        takedownRef: item.takedownRef,
        hasThreadGate: false,
        hasPostGate: false,
        violatesEmbeddingRules: false,
        violatesThreadGate: false,
        tags,
      }
      return acc.set(uri, reviewRating)
    }, base)
  }

  async getPosts(
    uris: string[],
    includeTakedowns = false,
    given = new HydrationMap<Post>(),
    viewer?: string | null,
    options: GetPostsHydrationOptions = {},
  ): Promise<Posts> {
    const [have, need] = split(uris, (uri) => given.has(uri))
    const base = have.reduce(
      (acc, uri) => acc.set(uri, given.get(uri) ?? null),
      new HydrationMap<Post>(),
    )
    if (!need.length) return base
    const res = await this.dataplane.getPostRecords(
      options.processDynamicTagsForView
        ? {
            uris: need,
            viewerDid: viewer ?? undefined,
            processDynamicTagsForView: options.processDynamicTagsForView,
          }
        : {
            uris: need,
          },
    )

    return need.reduce((acc, uri, i) => {
      const record = parseRecord<PostRecord>(res.records[i], includeTakedowns)
      const violatesThreadGate = res.meta[i].violatesThreadGate
      const violatesEmbeddingRules = res.meta[i].violatesEmbeddingRules
      const hasThreadGate = res.meta[i].hasThreadGate
      const hasPostGate = res.meta[i].hasPostGate
      const tags = new Set<string>(res.records[i].tags ?? [])
      const debug = { tags: Array.from(tags) }
      return acc.set(
        uri,
        record
          ? {
            ...record,
            violatesThreadGate,
            violatesEmbeddingRules,
            hasThreadGate,
            hasPostGate,
            tags,
              debug,
          }
          : null,
      )
    }, base)
  }

  async getPostViewerStates(
    refs: ThreadRef[],
    viewer: string,
  ): Promise<PostViewerStates> {
    if (!refs.length) return new HydrationMap<PostViewerState>()
    const threadRoots = refs.map((r) => r.threadRoot)
    const [likes, reposts, bookmarks, threadMutesMap] = await Promise.all([
      this.dataplane.getLikesByActorAndSubjects({
        actorDid: viewer,
        refs,
      }),
      this.dataplane.getRepostsByActorAndSubjects({
        actorDid: viewer,
        refs,
      }),
      this.dataplane.getBookmarksByActorAndSubjects({
        actorDid: viewer,
        uris: refs.map((r) => r.uri),
      }),
      this.getThreadMutes(threadRoots, viewer),
    ])
    return refs.reduce((acc, { uri, threadRoot }, i) => {
      return acc.set(uri, {
        like: parseString(likes.uris[i]),
        repost: parseString(reposts.uris[i]),
        // @NOTE: The dataplane contract is that the array position will be present,
        // but the optional chaining is to ensure it works regardless of the dataplane being update to provide the data.
        bookmarked: !!bookmarks.bookmarks.at(i)?.ref?.key,
        threadMuted: threadMutesMap.get(threadRoot) ?? false,
      })
    }, new HydrationMap<PostViewerState>())
  }

  private async getThreadMutes(
    threadRoots: string[],
    viewer: string,
  ): Promise<Map<string, boolean>> {
    const deduped = dedupeStrs(threadRoots)
    const threadMutes = await this.dataplane.getThreadMutesOnSubjects({
      actorDid: viewer,
      threadRoots: deduped,
    })
    return deduped.reduce((acc, cur, i) => {
      return acc.set(cur, threadMutes.muted[i] ?? false)
    }, new Map<string, boolean>())
  }

  async getThreadContexts(refs: ThreadRef[]): Promise<ThreadContexts> {
    if (!refs.length) return new HydrationMap<ThreadContext>()

    const refsByRootAuthor = refs.reduce((acc, ref) => {
      const { threadRoot } = ref
      const rootAuthor = didFromUri(threadRoot)
      const existingValue = acc.get(rootAuthor) ?? []
      return acc.set(rootAuthor, [...existingValue, ref])
    }, new Map<string, ThreadRef[]>())
    const refsByRootAuthorEntries = Array.from(refsByRootAuthor.entries())

    const likesPromises = refsByRootAuthorEntries.map(
      ([rootAuthor, refsForAuthor]) =>
        this.dataplane.getLikesByActorAndSubjects({
          actorDid: rootAuthor,
          refs: refsForAuthor.map(({ uri, cid }) => ({ uri, cid })),
        }),
    )

    const rootAuthorsLikes = await Promise.all(likesPromises)

    const likesByUri = refsByRootAuthorEntries.reduce(
      (acc, [_rootAuthor, refsForAuthor], i) => {
        const likesForRootAuthor = rootAuthorsLikes[i]
        refsForAuthor.forEach(({ uri }, j) => {
          acc.set(uri, likesForRootAuthor.uris[j])
        })
        return acc
      },
      new Map<string, string>(),
    )

    return refs.reduce((acc, { uri }) => {
      return acc.set(uri, {
        like: parseString(likesByUri.get(uri)),
      })
    }, new HydrationMap<ThreadContext>())
  }

  async getPostAggregates(
    refs: ItemRef[],
    viewer: string | null,
  ): Promise<PostAggs> {
    if (!refs.length) return new HydrationMap<PostAgg>()
    const counts = await this.dataplane.getInteractionCounts({
      refs,
      skipCacheForDids: viewer ? [viewer] : undefined,
    })
    return refs.reduce((acc, { uri }, i) => {
      return acc.set(uri, {
        likes: counts.likes[i] ?? 0,
        reposts: counts.reposts[i] ?? 0,
        replies: counts.replies[i] ?? 0,
        quotes: counts.quotes[i] ?? 0,
        bookmarks: counts.bookmarks[i] ?? 0,
        ratingCount: counts.ratingCount[i] ?? null,
        ratingAverage: counts.ratingAverage[i] ?? null,
        reviewCount: counts.reviewCount[i] ?? null,
      })
    }, new HydrationMap<PostAgg>())
  }

  async getFeedGens(
    uris: string[],
    includeTakedowns = false,
  ): Promise<FeedGens> {
    if (!uris.length) return new HydrationMap<FeedGen>()
    const res = await this.dataplane.getFeedGeneratorRecords({ uris })
    return uris.reduce((acc, uri, i) => {
      const record = parseRecord<FeedGenRecord>(
        res.records[i],
        includeTakedowns,
      )
      return acc.set(uri, record ?? null)
    }, new HydrationMap<FeedGen>())
  }

  async getFeedGenViewerStates(
    uris: string[],
    viewer: string,
  ): Promise<FeedGenViewerStates> {
    if (!uris.length) return new HydrationMap<FeedGenViewerState>()
    const likes = await this.dataplane.getLikesByActorAndSubjects({
      actorDid: viewer,
      refs: uris.map((uri) => ({ uri })),
    })
    return uris.reduce((acc, uri, i) => {
      return acc.set(uri, {
        like: parseString(likes.uris[i]),
      })
    }, new HydrationMap<FeedGenViewerState>())
  }

  async getFeedGenAggregates(
    refs: ItemRef[],
    viewer: string | null,
  ): Promise<FeedGenAggs> {
    if (!refs.length) return new HydrationMap<FeedGenAgg>()
    const counts = await this.dataplane.getInteractionCounts({
      refs,
      skipCacheForDids: viewer ? [viewer] : undefined,
    })
    return refs.reduce((acc, { uri }, i) => {
      return acc.set(uri, {
        likes: counts.likes[i] ?? 0,
      })
    }, new HydrationMap<FeedGenAgg>())
  }

  async getThreadgatesForPosts(
    postUris: string[],
    includeTakedowns = false,
  ): Promise<Threadgates> {
    if (!postUris.length) return new HydrationMap<Threadgate>()
    const uris = postUris.map(postUriToThreadgateUri)
    return this.getThreadgateRecords(uris, includeTakedowns)
  }

  async getThreadgateRecords(
    uris: string[],
    includeTakedowns = false,
  ): Promise<Threadgates> {
    const res = await this.dataplane.getThreadGateRecords({ uris })
    return uris.reduce((acc, uri, i) => {
      const record = parseRecord<ThreadgateRecord>(
        res.records[i],
        includeTakedowns,
      )
      return acc.set(uri, record ?? null)
    }, new HydrationMap<Threadgate>())
  }

  async getPostgatesForPosts(
    postUris: string[],
    includeTakedowns = false,
  ): Promise<Postgates> {
    if (!postUris.length) return new HydrationMap<Postgate>()
    const uris = postUris.map(postUriToPostgateUri)
    return this.getPostgateRecords(uris, includeTakedowns)
  }

  async getPostgateRecords(
    uris: string[],
    includeTakedowns = false,
  ): Promise<Postgates> {
    const res = await this.dataplane.getPostgateRecords({ uris })
    return uris.reduce((acc, uri, i) => {
      const record = parseRecord<PostgateRecord>(
        res.records[i],
        includeTakedowns,
      )
      return acc.set(uri, record ?? null)
    }, new HydrationMap<Postgate>())
  }

  async getLikes(uris: string[], includeTakedowns = false): Promise<Likes> {
    if (!uris.length) return new HydrationMap<Like>()
    const res = await this.dataplane.getLikeRecords({ uris })
    return uris.reduce((acc, uri, i) => {
      const record = parseRecord<LikeRecord>(res.records[i], includeTakedowns)
      return acc.set(uri, record ?? null)
    }, new HydrationMap<Like>())
  }

  async getReposts(uris: string[], includeTakedowns = false): Promise<Reposts> {
    if (!uris.length) return new HydrationMap<Repost>()
    const res = await this.dataplane.getRepostRecords({ uris })
    return uris.reduce((acc, uri, i) => {
      const record = parseRecord<RepostRecord>(res.records[i], includeTakedowns)
      return acc.set(uri, record ?? null)
    }, new HydrationMap<Repost>())
  }
}
