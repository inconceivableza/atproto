import { isMain as isRecordWithMedia } from './lexicon/types/app/bsky/embed/recordWithMedia'

/**
 * Separate nested embeds (recordWithMedia) into flat array
 * This follows the same pattern as bsky's separateEmbeds utility
 */
export const separateEmbeds = (embed: unknown): unknown[] => {
  if (!embed) return []

  if (isRecordWithMedia(embed)) {
    // RecordWithMedia can contain both a record and media (images/video/external)
    return [embed.record, embed.media]
  }

  return [embed]
}
