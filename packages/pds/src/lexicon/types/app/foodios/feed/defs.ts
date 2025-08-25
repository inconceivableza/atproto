/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as AppBskyFeedDefs from '../../bsky/feed/defs.js'
import type * as AppBskyActorDefs from '../../bsky/actor/defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.foodios.feed.defs'

export interface FeedViewPost {
  $type?: 'app.foodios.feed.defs#feedViewPost'
  post:
    | $Typed<AppBskyFeedDefs.PostView>
    | $Typed<RecipePostView>
    | { $type: string }
  reply?: ReplyRef
  reason?:
    | $Typed<AppBskyFeedDefs.ReasonRepost>
    | $Typed<AppBskyFeedDefs.ReasonPin>
    | { $type: string }
  /** Context provided by feed generator that may be passed back alongside interactions. */
  feedContext?: string
  /** Unique identifier per request that may be passed back alongside interactions. */
  reqId?: string
}

const hashFeedViewPost = 'feedViewPost'

export function isFeedViewPost<V>(v: V) {
  return is$typed(v, id, hashFeedViewPost)
}

export function validateFeedViewPost<V>(v: V) {
  return validate<FeedViewPost & V>(v, id, hashFeedViewPost)
}

export interface RecipePostView {
  $type?: 'app.foodios.feed.defs#recipePostView'
  uri: string
  cid: string
  author: AppBskyActorDefs.ProfileViewBasic
  title: string
  text: string
  indexedAt: string
  replyCount?: number
  repostCount?: number
  likeCount?: number
  viewer?: AppBskyFeedDefs.ViewerState
}

const hashRecipePostView = 'recipePostView'

export function isRecipePostView<V>(v: V) {
  return is$typed(v, id, hashRecipePostView)
}

export function validateRecipePostView<V>(v: V) {
  return validate<RecipePostView & V>(v, id, hashRecipePostView)
}

export interface ReplyRef {
  $type?: 'app.foodios.feed.defs#replyRef'
  root:
    | $Typed<AppBskyFeedDefs.PostView>
    | $Typed<AppBskyFeedDefs.NotFoundPost>
    | $Typed<AppBskyFeedDefs.BlockedPost>
    | $Typed<RecipePostView>
    | { $type: string }
  parent:
    | $Typed<AppBskyFeedDefs.PostView>
    | $Typed<AppBskyFeedDefs.NotFoundPost>
    | $Typed<AppBskyFeedDefs.BlockedPost>
    | $Typed<RecipePostView>
    | { $type: string }
  grandparentAuthor?: AppBskyActorDefs.ProfileViewBasic
}

const hashReplyRef = 'replyRef'

export function isReplyRef<V>(v: V) {
  return is$typed(v, id, hashReplyRef)
}

export function validateReplyRef<V>(v: V) {
  return validate<ReplyRef & V>(v, id, hashReplyRef)
}
