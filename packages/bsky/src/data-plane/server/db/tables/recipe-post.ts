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
export interface RecipeRevision {
    uri: string
    cid: string
    creator: string
    recipePostUri: string
    indexedAt: string
    createdAt: string
}

const recipeRevisionTableName = "recipe_revision"

export interface RecipeHeadRevision {
    recipePostUri: string
    recipeRevisionUri: string
}

const recipeHeadRevisionTableName = "recipe_head_revision"

export type PartialDB = {
    [recipePostTableName]: RecipePost,
    [recipeRevisionTableName]: RecipeRevision
    [recipeHeadRevisionTableName]: RecipeHeadRevision
}


