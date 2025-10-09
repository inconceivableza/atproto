import { Timestamp } from '@bufbuild/protobuf'
import { ServiceImpl } from '@connectrpc/connect'
import * as ui8 from 'uint8arrays'
import { keyBy } from '@atproto/common'
import { AtUri } from '@atproto/syntax'
import { ids } from '../../../lexicon/lexicons'
import { Service } from '../../../proto/bsky_connect'
import {
  GetRecipeRecordsRequest,
  GetReviewRatingRecordsRequest,
  PostRecordMeta,
  RecipeRecord,
  RecipeRevisionRecord,
  Record as ATRecord,
} from '../../../proto/bsky_pb'
import { AppFoodiosFeedRecipeRevision } from '@atproto/api'
import { Database } from '../db'
import { Record as BskyRecord } from '../db/tables/record'
import { Selectable, } from 'kysely'

export default (db: Database): Partial<ServiceImpl<typeof Service>> => ({
  getBlockRecords: getRecords(db, ids.AppBskyGraphBlock),
  getFeedGeneratorRecords: getRecords(db, ids.AppBskyFeedGenerator),
  getFollowRecords: getRecords(db, ids.AppBskyGraphFollow),
  getLikeRecords: getRecords(db, ids.AppBskyFeedLike),
  getListBlockRecords: getRecords(db, ids.AppBskyGraphListblock),
  getListItemRecords: getRecords(db, ids.AppBskyGraphListitem),
  getListRecords: getRecords(db, ids.AppBskyGraphList),
  getPostRecords: getPostRecords(db),
  getRecipeRecords: getRecipeRecords(db),
  getReviewRatingRecords: getReviewRatingRecords(db),
  getProfileRecords: getRecords(db, ids.AppBskyActorProfile),
  getRepostRecords: getRecords(db, ids.AppBskyFeedRepost),
  getThreadGateRecords: getRecords(db, ids.AppBskyFeedThreadgate),
  getPostgateRecords: getRecords(db, ids.AppBskyFeedPostgate),
  getLabelerRecords: getRecords(db, ids.AppBskyLabelerService),
  getActorChatDeclarationRecords: getRecords(db, ids.ChatBskyActorDeclaration),
  getNotificationDeclarationRecords: getRecords(
    db,
    ids.AppBskyNotificationDeclaration,
  ),
  getStarterPackRecords: getRecords(db, ids.AppBskyGraphStarterpack),
  getVerificationRecords: getRecords(db, ids.AppBskyGraphVerification),
  getStatusRecords: getRecords(db, ids.AppBskyActorStatus),
})

export const getRecords =
  (db: Database, collection?: string) =>
    async (req: { uris: string[] }): Promise<{ records: ATRecord[] }> => {
      const validUris = collection
        ? req.uris.filter((uri) => new AtUri(uri).collection === collection)
        : req.uris
      const res = validUris.length
        ? await db.db
          .selectFrom('record')
          .selectAll()
          .where('uri', 'in', validUris)
          .execute()
        : []
      const byUri = keyBy(res, 'uri')
      const records: ATRecord[] = req.uris.map((uri) => {
        const row = byUri.get(uri)
        const json = row ? row.json : JSON.stringify(null)
        const createdAtRaw = new Date(JSON.parse(json)?.['createdAt'])
        const createdAt = !isNaN(createdAtRaw.getTime())
          ? Timestamp.fromDate(createdAtRaw)
          : undefined
        const indexedAt = row?.indexedAt
          ? Timestamp.fromDate(new Date(row?.indexedAt))
          : undefined
        const recordBytes = ui8.fromString(json, 'utf8')
        return new ATRecord({
          record: recordBytes,
          cid: row?.cid,
          createdAt,
          indexedAt,
          sortedAt: compositeTime(createdAt, indexedAt),
          takenDown: !!row?.takedownRef,
          takedownRef: row?.takedownRef ?? undefined,
          tags: row?.tags ?? undefined,
        })
      })
      return { records }
    }

function makeRecordInfo(row: Selectable<BskyRecord>) {
  const createdAtRaw = new Date(JSON.parse(row.json)?.['createdAt'])
  const createdAt = !isNaN(createdAtRaw.getTime())
    ? Timestamp.fromDate(createdAtRaw)
    : undefined
  const indexedAt = row?.indexedAt
    ? Timestamp.fromDate(new Date(row?.indexedAt))
    : undefined
  return {
    uri: row.uri,
    cid: row?.cid,
    createdAt,
    indexedAt,
    sortedAt: compositeTime(createdAt, indexedAt),
    takenDown: !!row?.takedownRef,
    takedownRef: row?.takedownRef ?? undefined,
    tags: row?.tags ?? undefined,
  }
}

export const getRecipeRecords = (db: Database) => {
  const getBaseRecords = getRecords(db, ids.AppFoodiosFeedRecipePost)
  return async function (req: GetRecipeRecordsRequest) {
    // TODO: this could be optimized with a join + group by

    // await db.db
    //       .selectFrom('record')
    //       .select([sql<string>`ARRAY_AGG`.as('')])
    //       .where('uri', 'in', req.uris)
    //       .innerJoin("recipe_revision", "record.uri", "recipe_revision.recipePostUri")
    //       .execute()

    const revisionUris = req.uris.length > 0 ? await db.db.selectFrom("recipe_revision")
      .select("uri")
      .where("recipePostUri", "in", req.uris)
      .execute() : []
    const recipesAndRevisions = req.uris.length > 0 ?  await db.db
      .selectFrom('record')
      .selectAll()
      .where('uri', 'in', req.uris.concat(revisionUris.map(r => r.uri)))
      .execute() : []

    const recsByUri: Record<string, RecipeRecord> = {}
    const revisionsByUri: Record<string, RecipeRevisionRecord[]> = {}
    recipesAndRevisions.forEach(row => {
      const atUri = new AtUri(row.uri)
      if (atUri.collection === ids.AppFoodiosFeedRecipePost) {
        const json = row.json
        const recordBytes = ui8.fromString(json, 'utf8')
        recsByUri[row.uri] = new RecipeRecord({
          recordInfo: makeRecordInfo(row),
          record: recordBytes,
        })

      } else if (atUri.collection === ids.AppFoodiosFeedRecipeRevision) {
        const recordBytes = ui8.fromString(row.json, 'utf8')
        const parsed = JSON.parse(row.json)
        const recipeUri = AppFoodiosFeedRecipeRevision.isRecord<AppFoodiosFeedRecipeRevision.Record>(parsed) && parsed.recipePostRef.uri
        if (!recipeUri) return;
        const revs = revisionsByUri[recipeUri] ??= []
        revs.push(new RecipeRevisionRecord({
          recordInfo: makeRecordInfo(row),
          record: recordBytes
        }))
      }
    })
    const records = req.uris.map(uri => {
      const recipeRecord = recsByUri[uri] ?? new RecipeRecord()
      const revisions = revisionsByUri[uri] ?? []
      recipeRecord.revisions = revisions.toSorted((a, b) => (a.recordInfo?.sortedAt?.seconds ?? BigInt(0)) - (b.recordInfo?.sortedAt?.seconds ?? BigInt(0)) > 0 ? 1 : -1)
      return recipeRecord
    })
    return { records }
  }
}

export const getReviewRatingRecords = (db: Database) => {
  const getBaseRecords = getRecords(db, ids.AppFoodiosFeedReviewRating)
  return async function (req: GetReviewRatingRecordsRequest) {
    const { records } = await getBaseRecords(req)
    return { records }
  }
}

export const getPostRecords = (db: Database) => {
  const getBaseRecords = getRecords(db, ids.AppBskyFeedPost)
  return async (req: {
    uris: string[]
  }): Promise<{ records: ATRecord[]; meta: PostRecordMeta[] }> => {
    const [{ records }, details] = await Promise.all([
      getBaseRecords(req),
      req.uris.length
        ? await db.db
          .selectFrom('post')
          .where('uri', 'in', req.uris)
          .select([
            'uri',
            'violatesThreadGate',
            'violatesEmbeddingRules',
            'hasThreadGate',
            'hasPostGate',
          ])
          .execute()
        : [],
    ])
    const byKey = keyBy(details, 'uri')
    const meta = req.uris.map((uri) => {
      return new PostRecordMeta({
        violatesThreadGate: !!byKey.get(uri)?.violatesThreadGate,
        violatesEmbeddingRules: !!byKey.get(uri)?.violatesEmbeddingRules,
        hasThreadGate: !!byKey.get(uri)?.hasThreadGate,
        hasPostGate: !!byKey.get(uri)?.hasPostGate,
      })
    })
    return { records, meta }
  }
}

const compositeTime = (
  ts1: Timestamp | undefined,
  ts2: Timestamp | undefined,
) => {
  if (!ts1) return ts2
  if (!ts2) return ts1
  return ts1.toDate() < ts2.toDate() ? ts1 : ts2
}
