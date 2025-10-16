import { Insertable, Selectable, sql } from 'kysely'
import { CID } from 'multiformats/cid'
import { AtUri, normalizeDatetimeAlways } from '@atproto/syntax'
import * as lex from '../../../../lexicon/lexicons'
import * as ReviewRating from '../../../../lexicon/types/app/foodios/feed/reviewRating'
import { BackgroundQueue } from '../../background'
import { Database } from '../../db'
import { DatabaseSchema, DatabaseSchemaType } from '../../db/database-schema'
import { Notification } from '../../db/tables/notification'
import { excluded } from '../../db/util'
import { RecordProcessor } from '../processor'

const lexId = lex.ids.AppFoodiosFeedReviewRating

type Notif = Insertable<Notification>
type IndexedReviewRating = Selectable<DatabaseSchemaType['review_rating']>

const insertFn = async (
  db: DatabaseSchema,
  uri: AtUri,
  cid: CID,
  obj: ReviewRating.Record,
  timestamp: string,
): Promise<IndexedReviewRating | null> => {
  const inserted = await db
    .insertInto('review_rating')
    .values({
      uri: uri.toString(),
      cid: cid.toString(),
      creator: uri.host,
      subject: obj.subject.uri,
      subjectCid: obj.subject.cid,
      reviewRating: obj.reviewRating ?? null,
      text: obj.text ?? null,
      createdAt: normalizeDatetimeAlways(obj.createdAt),
      indexedAt: timestamp,
    })
    .onConflict((oc) => oc.doNothing())
    .returningAll()
    .executeTakeFirst()
  return inserted || null
}

const findDuplicate = async (
  db: DatabaseSchema,
  uri: AtUri,
  obj: ReviewRating.Record,
): Promise<AtUri | null> => {
  const found = await db
    .selectFrom('review_rating')
    .where('creator', '=', uri.host)
    .where('subject', '=', obj.subject.uri)
    .where('reviewAspect', '=', '')
    .selectAll()
    .executeTakeFirst()
  return found ? new AtUri(found.uri) : null
}

const notifsForInsert = (obj: IndexedReviewRating) => {
  const subjectUri = new AtUri(obj.subject)
  // prevent self-notifications
  const isReviewFromSubjectUser = subjectUri.host === obj.creator
  if (isReviewFromSubjectUser) {
    return []
  }

  const notifs: Notif[] = [
    // Notification to the author of the reviewed content
    {
      did: subjectUri.host,
      author: obj.creator,
      recordUri: obj.uri,
      recordCid: obj.cid,
      reason: 'review' as const,
      reasonSubject: subjectUri.toString(),
      sortAt: obj.sortAt,
    },
  ]

  return notifs
}

const deleteFn = async (
  db: DatabaseSchema,
  uri: AtUri,
): Promise<IndexedReviewRating | null> => {
  const deleted = await db
    .deleteFrom('review_rating')
    .where('uri', '=', uri.toString())
    .returningAll()
    .executeTakeFirst()
  return deleted || null
}

const notifsForDelete = (
  deleted: IndexedReviewRating,
  replacedBy: IndexedReviewRating | null,
) => {
  const toDelete = replacedBy ? [] : [deleted.uri]
  return { notifs: [], toDelete }
}

const updateAggregates = async (
  db: DatabaseSchema,
  reviewRating: IndexedReviewRating,
) => {
  const ratingAggQb = db
    .insertInto('rating_agg')
    .columns(['uri', 'aspect', 'ratingCount', 'ratingAverage', 'reviewCount'])
    .expression((eb) =>
      eb
        .selectFrom('review_rating')
        .select([
          'subject as uri',
          sql<string>`coalesce(review_rating."reviewAspect", '')`.as('aspect'),
          sql<number>`count(review_rating."reviewRating")`.as('ratingCount'),
          sql<number>`avg(review_rating."reviewRating")`.as('ratingAverage'),
          sql<number>`count(review_rating.text) FILTER (where text <> '')`.as('reviewCount'),
        ])
        .where('review_rating.subject', '=', reviewRating.subject)
        .where('review_rating.reviewRating', 'is not', null)
        .groupBy(['subject', 'reviewAspect'])
    )
    .onConflict((oc) =>
      oc.columns(['uri', 'aspect']).doUpdateSet({
        ratingCount: excluded(db, 'ratingCount'),
        ratingAverage: excluded(db, 'ratingAverage'),
        reviewCount: excluded(db, 'reviewCount'),
      }),
    )
  await ratingAggQb.execute()
}

export type PluginType = RecordProcessor<
  ReviewRating.Record,
  IndexedReviewRating
>

export const makePlugin = (
  db: Database,
  background: BackgroundQueue,
): PluginType => {
  return new RecordProcessor(db, background, {
    lexId,
    insertFn,
    findDuplicate,
    deleteFn,
    notifsForInsert,
    notifsForDelete,
    updateAggregates,
  })
}

export default makePlugin
