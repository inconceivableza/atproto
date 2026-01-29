import { Database } from '../../db'
import RecordProcessor, { RecordProcessorParams } from '../processor'
import { DatabaseSchemaType } from '../../db/database-schema'
import {
    Record as RecipeRevisionRecord
} from '../../../../lexicon/types/app/foodios/feed/recipeRevision'
import { Selectable } from 'kysely'
import { BackgroundQueue } from '../../background'
import * as lex from '../../../../lexicon/lexicons'
import { normalizeDatetimeAlways } from '@atproto/syntax'
import { separateEmbeds } from '../util'
import { isMain as isEmbedImage } from '../../../../lexicon/types/app/bsky/embed/images'
import { isMain as isEmbedVideo } from '../../../../lexicon/types/app/bsky/embed/video'

type RecipeRevision = Selectable<DatabaseSchemaType['recipe_revision']>

interface IndexedRecipeRevision {
    recipeRevision: RecipeRevision
}

export type PluginType = RecordProcessor<RecipeRevisionRecord, IndexedRecipeRevision>
type Params = RecordProcessorParams<RecipeRevisionRecord, IndexedRecipeRevision>
const lexId = lex.ids.AppFoodiosFeedRecipeRevision

const insertFn: Params["insertFn"] = async (db, uri, cid, obj, timestamp) => {
    // TODO: consider what happens when events are ingested out of order - 
    // recipe revision arrives before recipe post

    const recipeRevision = await db.insertInto("recipe_revision").values({
        cid: cid.toString(),
        uri: uri.toString(),
        recipePostUri: obj.recipePostRef.uri,
        creator: uri.host,
        indexedAt: timestamp,
        createdAt: normalizeDatetimeAlways(obj.createdAt),
    }).onConflict(oc => oc.doNothing())
        .returningAll()
        .executeTakeFirst()

    if (!recipeRevision) {
        return null
    }

    // TODO: check the timestamp of current head before replacing it
    await db.insertInto("recipe_head_revision").values({
        recipePostUri: obj.recipePostRef.uri,
        recipeRevisionUri: uri.toString()
    }).onConflict(oc =>
        oc
            .column('recipePostUri')
            .doUpdateSet({ recipeRevisionUri: uri.toString() })
    ).execute()

    // Clear the embed metadata (useful for if this is an edit)
    const recipePostUri = obj.recipePostRef.uri
    await Promise.all([
        db
            .deleteFrom('post_embed_image')
            .where('postUri', '=', recipePostUri)
            .execute(),
        db
            .deleteFrom('post_embed_video')
            .where('postUri', '=', recipePostUri)
            .executeTakeFirst(),
    ])

    const postEmbeds = separateEmbeds(obj.embed)
    for (const postEmbed of postEmbeds) {
        if (isEmbedImage(postEmbed)) {
            const { images } = postEmbed
            const imagesEmbed = images.map((img, i) => ({
                postUri: recipePostUri,
                position: i,
                imageCid: img.image.ref.toString(),
                alt: img.alt,
            }))
            await db.insertInto('post_embed_image').values(imagesEmbed).execute()
        } else if (isEmbedVideo(postEmbed)) {
            const { video } = postEmbed
            const videoEmbed = {
                postUri: recipePostUri,
                videoCid: video.ref.toString(),
                // @NOTE: alt is required for image but not for video on the lexicon.
                alt: postEmbed.alt ?? null,
            }
            await db.insertInto('post_embed_video').values(videoEmbed).execute()
        }
    }

    return {
        recipeRevision,
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