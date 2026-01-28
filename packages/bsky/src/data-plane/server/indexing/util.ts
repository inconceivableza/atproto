import {
  Record as PostRecord,
} from '../../../lexicon/types/app/bsky/feed/post'
import { $Typed } from '../../../lexicon/util'
import { RecordWithMedia } from '../../../views/types'
import { isMain as isEmbedRecordWithMedia } from '../../../lexicon/types/app/bsky/embed/recordWithMedia'
import * as lex from '../../../lexicon/lexicons'
import { DatabaseSchema } from '../db'

export function separateEmbeds(
  embed: PostRecord['embed'],
): Array<
  | RecordWithMedia['media']
  | $Typed<RecordWithMedia['record']>
  | NonNullable<PostRecord['embed']>
> {
  if (!embed) {
    return []
  }
  if (isEmbedRecordWithMedia(embed)) {
    return [{ $type: lex.ids.AppBskyEmbedRecord, ...embed.record }, embed.media]
  }
  return [embed]
}