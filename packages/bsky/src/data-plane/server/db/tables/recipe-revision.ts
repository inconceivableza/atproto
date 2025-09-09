export interface RecipeRevision {
    uri: string
    cid: string
    creator: string
    recipePostUri: string
    indexedAt: string
    createdAt: string
}

const tableName = "recipe_revision"

export type PartialDB = {
    [tableName]: RecipeRevision,
}
