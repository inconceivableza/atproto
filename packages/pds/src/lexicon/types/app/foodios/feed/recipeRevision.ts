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
import type * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef.js'
import type * as AppBskyEmbedImages from '../../bsky/embed/images.js'
import type * as AppBskyEmbedVideo from '../../bsky/embed/video.js'
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'
import type * as AppBskyEmbedExternal from '../../bsky/embed/external.js'
import type * as AppBskyEmbedRecord from '../../bsky/embed/record.js'
import type * as AppBskyEmbedRecordWithMedia from '../../bsky/embed/recordWithMedia.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.foodios.feed.recipeRevision'

export interface Record {
  $type: 'app.foodios.feed.recipeRevision'
  recipePostRef: ComAtprotoRepoStrongRef.Main
  parentRevisionRef?: ComAtprotoRepoStrongRef.Main
  title: string
  text: string
  ingredients: Ingredient[]
  steps: Step[]
  images?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | { $type: string }
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string }
  /** Additional hashtags, in addition to any included in post text and facets. */
  tags?: string[]
  /** Client-declared timestamp when this post was originally created. */
  createdAt: string
  embed?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | $Typed<AppBskyEmbedExternal.Main>
    | $Typed<AppBskyEmbedRecord.Main>
    | $Typed<AppBskyEmbedRecordWithMedia.Main>
    | { $type: string }
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}

export interface Step {
  $type?: 'app.foodios.feed.recipeRevision#step'
  text: string
  images?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | { $type: string }
}

const hashStep = 'step'

export function isStep<V>(v: V) {
  return is$typed(v, id, hashStep)
}

export function validateStep<V>(v: V) {
  return validate<Step & V>(v, id, hashStep)
}

/** TODO add description/alternatives properties? */
export interface Ingredient {
  $type?: 'app.foodios.feed.recipeRevision#ingredient'
  name: string
  quantity: string
  unit: string
}

const hashIngredient = 'ingredient'

export function isIngredient<V>(v: V) {
  return is$typed(v, id, hashIngredient)
}

export function validateIngredient<V>(v: V) {
  return validate<Ingredient & V>(v, id, hashIngredient)
}
