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

const is$typed = _is$typed,
  validate = _validate
const id = 'app.foodios.feed.reviewRating'

export interface Record {
  $type: 'app.foodios.feed.reviewRating'
  subject: ComAtprotoRepoStrongRef.Main
  createdAt: string
  /** Rating value from 1 to 10 (representing 1/2 to 5 stars). */
  reviewRating?: number
  /** The actual body of the review (reviewBody). */
  text?: string
  embed?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | { $type: string }
  /** Indicates human language of post primary text content. */
  langs?: string[]
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string }
  /** Additional hashtags, in addition to any included in post text and facets. */
  tags?: string[]
  [k: string]: unknown
}

const hashRecord = 'main'

export function isRecord<V>(v: V) {
  return is$typed(v, id, hashRecord)
}

export function validateRecord<V>(v: V) {
  return validate<Record & V>(v, id, hashRecord, true)
}
