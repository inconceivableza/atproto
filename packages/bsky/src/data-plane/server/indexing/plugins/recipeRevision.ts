import { Database } from '../../db'
import RecordProcessor, { RecordProcessorParams } from '../processor'
import { DatabaseSchemaType } from '../../db/database-schema'
import { Selectable } from 'kysely'
import { BackgroundQueue } from '../../background'
import * as lex from '../../../../lexicon/lexicons'
import { normalizeDatetimeAlways } from '@atproto/syntax'

type RecipeRevision = Selectable<DatabaseSchemaType['recipe_revision']>

interface IndexedRecipeRevision {
    recipeRevision: RecipeRevision
}

export type PluginType = RecordProcessor<RecipeRevision, IndexedRecipeRevision>
type Params = RecordProcessorParams<RecipeRevision, IndexedRecipeRevision>
const lexId = lex.ids.AppFoodiosFeedRecipePost

const insertFn: Params["insertFn"] = async (db, uri, cid, obj, timestamp) => {
    const recipeRevision = await db.insertInto("recipe_revision").values({
        cid: cid.toString(),
        uri: uri.toString(),
        recipePostUri: obj.recipePostUri,
        creator: uri.host,
        indexedAt: timestamp,
        createdAt: normalizeDatetimeAlways(obj.createdAt),
    }).onConflict(oc => oc.doNothing())
        .returningAll()
        .executeTakeFirst()

    if (!recipeRevision) {
        return null
    }

    return {
        recipeRevision
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


            const recipeRevision = await db.deleteFrom("recipe_revision")
                .where("uri", "=", uri.toString())
                .returningAll()
                .executeTakeFirst()

            await db.deleteFrom('feed_item').where('postUri', '=', uri.toString()).execute()

            return recipeRevision ? {
                recipeRevision,
                // ingredients: deletedIngredients,
                // steps: deletedSteps
            } : null


        },
        notifsForInsert: (obj) => {
            return []
        },
        notifsForDelete: (deleted) => {
            // TODO: examine
            return {
                notifs: [],
                toDelete: [deleted.recipeRevision.uri]
            }
        },
        updateAggregates: async () => {
            // TODO: implement like, replies etc
        },
    })
}

export default makePlugin