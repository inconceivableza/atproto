import { Database } from '../../db'
import RecordProcessor, { RecordProcessorParams } from '../processor'
import {
    Record as RecipeRecord
} from '../../../../lexicon/types/app/foodios/feed/recipePost'
import { DatabaseSchemaType } from '../../db/database-schema'
import { Selectable } from 'kysely'
import { BackgroundQueue } from '../../background'
import * as lex from '../../../../lexicon/lexicons'
import { normalizeDatetimeAlways } from '@atproto/syntax'

type RecipePost = Selectable<DatabaseSchemaType['recipe_post']>
interface IndexedRecipePost {
    recipePost: RecipePost
}

export type PluginType = RecordProcessor<RecipeRecord, IndexedRecipePost>
type Params = RecordProcessorParams<RecipeRecord, IndexedRecipePost>
const lexId = lex.ids.AppFoodiosFeedRecipePost

const insertFn: Params["insertFn"] = async (db, uri, cid, obj, timestamp) => {
    const insertedRecipe = await db.insertInto("recipe_post").values({
        cid: cid.toString(),
        uri: uri.toString(),
        creator: uri.host,
        createdAt: normalizeDatetimeAlways(obj.createdAt),
        indexedAt: timestamp,
    }).onConflict(oc => oc.doNothing())
        .returningAll()
        .executeTakeFirst()

    if (!insertedRecipe) {
        return null
    }

    await db.insertInto("feed_item").values({
        type: "recipe",
        cid: insertedRecipe.cid,
        originatorDid: insertedRecipe.creator,
        postUri: insertedRecipe.uri,
        uri: insertedRecipe.uri,
        sortAt:
            insertedRecipe.indexedAt < insertedRecipe.createdAt ? insertedRecipe.indexedAt : insertedRecipe.createdAt,
    }).onConflict((oc) => oc.doNothing())
        .execute()


    return {
        recipePost: insertedRecipe,
    }
}

export const makePlugin = (
    db: Database,
    background: BackgroundQueue,
): PluginType => {
    return new RecordProcessor(db, background, {
        lexId,
        insertFn,
        // TODO: Determine whether we want this to work (posts table does the same thing)
        findDuplicate: async () => null,
        deleteFn: async (db, uri) => {
            const uriStr = uri.toString()

            // TODO: update foreign key constraints to cascade deletes
            await db.deleteFrom("recipe_head_revision")
                .where("recipePostUri", "=", uriStr).execute()

            await db.deleteFrom("recipe_revision")
                .where("recipePostUri", "=", uriStr).execute()

            const deletedPost = await db.deleteFrom("recipe_post")
                .where("uri", "=", uriStr)
                .returningAll()
                .executeTakeFirst()

            await db.deleteFrom('feed_item').where('postUri', '=', uriStr).execute()
            // These get inserted in the recipeRevision plugin
            await Promise.all([
                db
                    .deleteFrom('post_embed_image')
                    .where('postUri', '=', uriStr)
                    .execute(),
                db
                    .deleteFrom('post_embed_video')
                    .where('postUri', '=', uriStr)
                    .executeTakeFirst(),
            ])

            return deletedPost ? {
                recipePost: deletedPost,
            } : null


        },
        notifsForInsert: (obj) => {
            return []
        },
        notifsForDelete: (deleted) => {
            // TODO: examine
            return {
                notifs: [],
                toDelete: [deleted.recipePost.uri]
            }
        },
        updateAggregates: async () => {
            // TODO: implement like, replies etc
        },
    })
}

export default makePlugin