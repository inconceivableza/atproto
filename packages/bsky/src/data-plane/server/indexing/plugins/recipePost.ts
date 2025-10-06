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
// type PostIngredient = Selectable<DatabaseSchemaType['recipe_ingredient']>
// type PostStep = Selectable<DatabaseSchemaType['recipe_step']>

interface IndexedRecipePost {
    recipePost: RecipePost
    // ingredients: PostIngredient[]
    // steps: PostStep[]
}

export type PluginType = RecordProcessor<RecipeRecord, IndexedRecipePost>
type Params = RecordProcessorParams<RecipeRecord, IndexedRecipePost>
const lexId = lex.ids.AppFoodiosFeedRecipePost

const insertFn: Params["insertFn"] = async (db, uri, cid, obj, timestamp) => {
    const insertedRecipe = await db.insertInto("recipe_post").values({
        cid: cid.toString(),
        uri: uri.toString(),
        creator: uri.host,
        // text: obj.text,
        // title: obj.text,
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

    // // TODO: validate quantity
    // const [insertedIngredients, insertedSteps] = await Promise.all([
    //     obj.ingredients.length ?
    //         db.insertInto("recipe_ingredient").values(obj.ingredients.map(({ name, quantity, unit }, i) => ({
    //             ingredient: name,
    //             order: i,
    //             quantity: Number(quantity),
    //             recipePostURI: uri.toString(),
    //             unit
    //         }))).onConflict(oc => oc.doNothing())
    //             .returningAll()
    //             .execute() : [],
    //     obj.steps.length ?
    //         db.insertInto("recipe_step").values(obj.steps.map(({ text }, i) => ({
    //             recipePostURI: uri.toString(),
    //             order: i,
    //             text
    //         }))).onConflict(oc => oc.doNothing())
    //             .returningAll()
    //             .execute() : []
    // ])

    return {
        recipePost: insertedRecipe,
        // ingredients: insertedIngredients,
        // steps: insertedSteps
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

            // const [deletedSteps, deletedIngredients] = await Promise.all([
            //     db.deleteFrom("recipe_step")
            //         .where("recipePostURI", "=", uri.toString())
            //         .returningAll()
            //         .execute(),
            //     db.deleteFrom("recipe_ingredient")
            //         .where("recipePostURI", "=", uri.toString())
            //         .returningAll()
            //         .execute()
            // ])
            const deletedPost = await db.deleteFrom("recipe_post")
                .where("uri", "=", uri.toString())
                .returningAll()
                .executeTakeFirst()

            await db.deleteFrom('feed_item').where('postUri', '=', uri.toString()).execute()

            return deletedPost ? {
                recipePost: deletedPost,
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
                toDelete: [deleted.recipePost.uri]
            }
        },
        updateAggregates: async () => {
            // TODO: implement like, replies etc
        },
    })
}

export default makePlugin