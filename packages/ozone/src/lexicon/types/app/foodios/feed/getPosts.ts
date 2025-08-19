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
import type * as AppFoodiosFeedDefs from './defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.foodios.feed.getPosts'

export type QueryParams = {
  /** List of post AT-URIs to return hydrated views for. */
  uris: string[]
}
export type InputSchema = undefined

export interface OutputSchema {
  posts: (
    | $Typed<AppBskyFeedDefs.PostView>
    | $Typed<AppFoodiosFeedDefs.RecipePostView>
    | { $type: string }
  )[]
}

export type HandlerInput = void

export interface HandlerSuccess {
  encoding: 'application/json'
  body: OutputSchema
  headers?: { [key: string]: string }
}

export interface HandlerError {
  status: number
  message?: string
}

export type HandlerOutput = HandlerError | HandlerSuccess
