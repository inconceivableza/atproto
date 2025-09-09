import { GeneratedAlways } from "kysely"

const recipePostTableName = 'recipe_post'

export interface RecipePost {
    uri: string
    cid: string
    creator: string
    createdAt: string
    indexedAt: string
    sortAt: GeneratedAlways<string>
}

export type PartialDB = {
    [recipePostTableName]: RecipePost,
}


